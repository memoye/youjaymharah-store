import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import type { IPaymentModuleService } from "@medusajs/framework/types";
import { requireIsolatedDatabase } from "../helpers/isolated-database";
import { sendRefundIssuedEmailWorkflow } from "../../src/workflows/send-refund-issued-email";

requireIsolatedDatabase();
jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  inApp: true,
  dbName: "medusa-payment-safety-integration",
  testSuite: ({ getContainer }) => {
    describe("payment module persistence with mocked gateway HTTP", () => {
      let service: IPaymentModuleService;
      let verification: Record<string, unknown>;
      let refundFails: boolean;
      let fetchMock: jest.SpyInstance;

      beforeEach(() => {
        service = getContainer().resolve(Modules.PAYMENT);
        verification = { status: "success", amount: 10_000, currency: "NGN" };
        refundFails = false;
        fetchMock = jest
          .spyOn(global, "fetch")
          .mockImplementation(async (url, options) => {
            const target = new URL(String(url));
            if (target.origin !== "https://api.paystack.co")
              throw new Error(
                "Unexpected external request in isolated payment test",
              );
            const body = options?.body ? JSON.parse(String(options.body)) : {};
            let data: Record<string, unknown>;
            if (target.pathname === "/transaction/initialize") {
              data = {
                reference: body.reference,
                authorization_url: "https://example.com/test-payment",
              };
            } else if (target.pathname.startsWith("/transaction/verify/")) {
              data = {
                reference: decodeURIComponent(
                  target.pathname.split("/").at(-1)!,
                ),
                ...verification,
              };
            } else if (target.pathname === "/refund") {
              if (refundFails)
                return new Response(
                  JSON.stringify({
                    status: false,
                    message: "Test gateway unavailable",
                  }),
                  { status: 503 },
                );
              data = { id: "gateway-refund", status: "processed" };
            } else throw new Error("Unexpected Paystack endpoint in test");
            return new Response(JSON.stringify({ status: true, data }));
          });
      });
      afterEach(() => {
        jest.restoreAllMocks();
      });

      async function session() {
        const collection = await service.createPaymentCollections({
          currency_code: "ngn",
          amount: 100,
        });
        return service.createPaymentSession(collection.id, {
          provider_id: "pp_paystack_paystack",
          currency_code: "ngn",
          amount: 100,
          data: { payer: { email: "payment-test@example.com" } },
        });
      }
      async function capturedPayment() {
        const pending = await session();
        const payment = await service.authorizePaymentSession(pending.id, {});
        if (!payment) throw new Error("Expected an authorized payment");
        return payment;
      }
      function emittedRefunds(spy: jest.SpyInstance) {
        return spy.mock.calls
          .flatMap(([events]) => (Array.isArray(events) ? events : [events]))
          .filter((event) => event.name === "payment.refund.created");
      }

      it.each([
        { amount: 1 },
        { currency: "USD" },
        { reference: "another-payment" },
      ])(
        "rejects mismatched verification without persisting a payment: %j",
        async (change) => {
          const pending = await session();
          Object.assign(verification, change);
          await expect(
            service.authorizePaymentSession(pending.id, {}),
          ).rejects.toThrow("does not match");
          const collection = await service.retrievePaymentCollection(
            pending.payment_collection_id,
            { relations: ["payments"] },
          );
          expect(collection.payments).toHaveLength(0);
          expect(
            (await service.retrievePaymentSession(pending.id)).status,
          ).not.toBe("authorized");
        },
      );

      it("repeated authorization does not create a second payment or capture", async () => {
        const pending = await session();
        const first = await service.authorizePaymentSession(pending.id, {});
        const second = await service.authorizePaymentSession(pending.id, {});
        expect(second?.id).toBe(first?.id);
        const collection = await service.retrievePaymentCollection(
          pending.payment_collection_id,
          { relations: ["payments", "payments.captures"] },
        );
        const payments = collection.payments ?? [];
        expect(payments).toHaveLength(1);
        expect(payments[0].captures).toHaveLength(1);
        expect(Number(payments[0].captures?.[0]?.amount)).toBe(100);
      });

      it("emits the exact refund ID for each partial refund", async () => {
        const payment = await capturedPayment();
        const events = jest.spyOn(
          getContainer().resolve(Modules.EVENT_BUS),
          "emit",
        );
        await service.refundPayment({ payment_id: payment.id, amount: 20 });
        const result = await service.refundPayment({
          payment_id: payment.id,
          amount: 30,
        });
        const refunds = result.refunds ?? [];
        expect(refunds).toHaveLength(2);
        expect(
          emittedRefunds(events)
            .map((event) => event.data.id)
            .sort(),
        ).toEqual(refunds.map((refund) => refund.id).sort());
        const { result: email } = await sendRefundIssuedEmailWorkflow(
          getContainer(),
        ).run({ input: { refund_id: refunds[0].id } });
        expect(email).toMatchObject({
          refund_id: refunds[0].id,
          payment_id: payment.id,
          sent_to: null,
        });
      });

      it("does not retain or email a refund rejected by the provider", async () => {
        const payment = await capturedPayment();
        const events = jest.spyOn(
          getContainer().resolve(Modules.EVENT_BUS),
          "emit",
        );
        refundFails = true;
        await expect(
          service.refundPayment({ payment_id: payment.id, amount: 20 }),
        ).rejects.toThrow();
        const stored = await service.retrievePayment(payment.id, {
          relations: ["refunds"],
        });
        expect(stored.refunds).toHaveLength(0);
        // Nested cleanup may flush the aggregated create event after deleting
        // the refund. Such an event must never produce a customer email.
        for (const event of emittedRefunds(events)) {
          await expect(
            sendRefundIssuedEmailWorkflow(getContainer()).run({
              input: { refund_id: event.data.id },
            }),
          ).rejects.toThrow();
        }
        expect(
          await getContainer()
            .resolve(Modules.NOTIFICATION)
            .listNotifications({}),
        ).toHaveLength(0);
      });

      it("serializes competing refunds so their sum cannot exceed the capture", async () => {
        const payment = await capturedPayment();
        const outcomes = await Promise.allSettled([
          service.refundPayment({ payment_id: payment.id, amount: 60 }),
          service.refundPayment({ payment_id: payment.id, amount: 60 }),
        ]);
        expect(
          outcomes.filter((outcome) => outcome.status === "fulfilled"),
        ).toHaveLength(1);
        const stored = await service.retrievePayment(payment.id, {
          relations: ["refunds"],
        });
        expect(stored.refunds).toHaveLength(1);
        expect(Number(stored.refunds?.[0]?.amount)).toBe(60);
        expect(
          fetchMock.mock.calls.filter(([url]) =>
            String(url).endsWith("/refund"),
          ),
        ).toHaveLength(1);
      });
    });
  },
});
