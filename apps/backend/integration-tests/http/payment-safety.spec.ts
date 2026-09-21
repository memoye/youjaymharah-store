import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import type { IPaymentModuleService } from "@medusajs/framework/types";
import { requireIsolatedDatabase } from "../helpers/isolated-database";
import { sendRefundIssuedEmailWorkflow } from "../../src/workflows/send-refund-issued-email";
import {
  completeCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

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
            if (
              target.origin === "https://api.resend.com" &&
              target.pathname === "/emails"
            ) {
              return new Response(
                JSON.stringify({ id: "isolated-checkout-email" }),
              );
            }
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

      async function checkoutCart() {
        const container = getContainer();
        const channel = await container
          .resolve(Modules.SALES_CHANNEL)
          .createSalesChannels({ name: "Isolated checkout channel" });
        const region = await container
          .resolve(Modules.REGION)
          .createRegions({
            name: "Isolated NG region",
            currency_code: "ngn",
            countries: ["ng"],
          });
        const profile = await container
          .resolve(Modules.FULFILLMENT)
          .createShippingProfiles({
            name: "Isolated checkout profile",
            type: "default",
          });
        const { result: products } = await createProductsWorkflow(
          container,
        ).run({
          input: {
            products: [
              {
                title: "Isolated checkout product",
                handle: "isolated-checkout-product",
                status: "published",
                shipping_profile_id: profile.id,
                sales_channels: [{ id: channel.id }],
                options: [{ title: "Size", values: ["One"] }],
                variants: [
                  {
                    title: "One",
                    manage_inventory: false,
                    options: { Size: "One" },
                    prices: [{ currency_code: "ngn", amount: 100 }],
                  },
                ],
              },
            ],
          },
        });
        const variant = products[0].variants[0];
        const cart = await container.resolve(Modules.CART).createCarts({
          currency_code: "ngn",
          region_id: region.id,
          sales_channel_id: channel.id,
          email: "checkout@example.com",
          shipping_address: {
            first_name: "Test",
            last_name: "Buyer",
            address_1: "Test address",
            city: "Lagos",
            country_code: "ng",
          },
          items: [
            {
              title: "Isolated checkout product",
              variant_id: variant.id,
              quantity: 1,
              unit_price: 100,
              requires_shipping: false,
              is_tax_inclusive: false,
            },
          ],
        });
        const { result: collection } =
          await createPaymentCollectionForCartWorkflow(container).run({
            input: { cart_id: cart.id },
          });
        await service.createPaymentSession(collection.id, {
          provider_id: "pp_paystack_paystack",
          currency_code: "ngn",
          amount: 100,
          data: { payer: { email: "checkout@example.com" } },
        });
        return { cart, collection };
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

      it("completes a paid cart once, preserving one order, payment and capture on replay", async () => {
        const { cart, collection } = await checkoutCart();
        const container = getContainer();
        const first = await completeCartWorkflow(container).run({
          input: { id: cart.id },
        });
        const second = await completeCartWorkflow(container).run({
          input: { id: cart.id },
        });
        expect(second.result.id).toBe(first.result.id);
        const { data: links } = await container
          .resolve("query")
          .graph({
            entity: "order_cart",
            fields: ["order_id", "cart_id"],
            filters: { cart_id: cart.id },
          });
        expect(links).toEqual([
          expect.objectContaining({
            order_id: first.result.id,
            cart_id: cart.id,
          }),
        ]);
        expect(
          (await container.resolve(Modules.CART).retrieveCart(cart.id))
            .completed_at,
        ).not.toBeNull();
        const paid = await service.retrievePaymentCollection(collection.id, {
          relations: ["payments", "payments.captures"],
        });
        expect(paid.payments).toHaveLength(1);
        expect(paid.payments?.[0]?.captures).toHaveLength(1);
        expect(Number(paid.payments?.[0]?.captures?.[0]?.amount)).toBe(100);
      });

      it("does not leave a completed cart or live order after underpayment fails verification", async () => {
        const { cart } = await checkoutCart();
        verification.amount = 1;
        const container = getContainer();
        await expect(
          completeCartWorkflow(container).run({ input: { id: cart.id } }),
        ).rejects.toThrow("does not match");
        expect(
          (await container.resolve(Modules.CART).retrieveCart(cart.id))
            .completed_at,
        ).toBeNull();
        const { data: links } = await container
          .resolve("query")
          .graph({
            entity: "order_cart",
            fields: ["order_id"],
            filters: { cart_id: cart.id },
          });
        expect(links).toHaveLength(0);
        expect(
          await container.resolve(Modules.ORDER).listOrders({}),
        ).toHaveLength(0);
      });
    });
  },
});
