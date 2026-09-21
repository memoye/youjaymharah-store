import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { requireIsolatedDatabase } from "../helpers/isolated-database";
import { physicalCheckoutFixture } from "../helpers/physical-checkout";

requireIsolatedDatabase();
jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  inApp: true,
  dbName: "medusa-physical-checkout-integration",
  testSuite: ({ getContainer, utils }) => {
    describe("physical checkout with real pricing, tax and inventory", () => {
      let fetchMock: jest.SpyInstance;
      let paidAmount: number | undefined;
      let initialized: Map<string, number>;

      beforeEach(() => {
        paidAmount = undefined;
        initialized = new Map();
        fetchMock = jest
          .spyOn(global, "fetch")
          .mockImplementation(async (url, options) => {
            const target = new URL(String(url));
            if (
              target.origin === "https://api.resend.com" &&
              target.pathname === "/emails"
            ) {
              return new Response(
                JSON.stringify({ id: "physical-checkout-test-email" }),
              );
            }
            if (target.origin !== "https://api.paystack.co") {
              throw new Error(
                "Unexpected external request in physical checkout test",
              );
            }
            let data: Record<string, unknown>;
            if (target.pathname === "/transaction/initialize") {
              const body = JSON.parse(String(options?.body));
              initialized.set(body.reference, Number(body.amount));
              data = {
                reference: body.reference,
                authorization_url: "https://example.com/test-payment",
              };
            } else if (target.pathname.startsWith("/transaction/verify/")) {
              const reference = decodeURIComponent(
                target.pathname.split("/").at(-1)!,
              );
              if (!initialized.has(reference))
                throw new Error("Unknown payment reference");
              data = {
                reference,
                status: "success",
                currency: "NGN",
                amount: paidAmount ?? initialized.get(reference),
              };
            } else {
              throw new Error(
                "Unexpected gateway endpoint in physical checkout test",
              );
            }
            return new Response(JSON.stringify({ status: true, data }));
          });
      });
      afterEach(async () => {
        await new Promise<void>((resolve) => setImmediate(resolve));
        await utils.waitWorkflowExecutions();
        jest.restoreAllMocks();
      });

      async function storedCart(id: string) {
        const {
          data: [cart],
        } = await getContainer()
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({
            entity: "cart",
            fields: [
              "id",
              "completed_at",
              "total",
              "item_subtotal",
              "item_tax_total",
              "shipping_subtotal",
              "shipping_tax_total",
            ],
            filters: { id },
          });
        return cart;
      }
      async function collection(id: string) {
        return getContainer()
          .resolve(Modules.PAYMENT)
          .retrievePaymentCollection(id, {
            relations: ["payments", "payments.captures"],
          });
      }
      async function expectUncompleted(id: string, collectionId: string) {
        expect((await storedCart(id)).completed_at).toBeNull();
        const { data: links } = await getContainer()
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({
            entity: "order_cart",
            fields: ["order_id"],
            filters: { cart_id: id },
          });
        expect(links).toHaveLength(0);
        expect((await collection(collectionId)).payments).toHaveLength(0);
      }
      function verificationCalls() {
        return fetchMock.mock.calls.filter(([url]) =>
          String(url).includes("/transaction/verify/"),
        );
      }

      it.each([false, true])(
        "charges shipping and tax and reserves once on replay (tax-inclusive prices: %s)",
        async (taxInclusive) => {
          const container = getContainer();
          const fixture = await physicalCheckoutFixture(container, {
            taxInclusive,
          });
          const cart = await fixture.cart();
          const totals = await storedCart(cart.id);
          expect({
            item_subtotal: Number(totals.item_subtotal),
            item_tax_total: Number(totals.item_tax_total),
            shipping_subtotal: Number(totals.shipping_subtotal),
            shipping_tax_total: Number(totals.shipping_tax_total),
            total: Number(totals.total),
          }).toEqual({
            item_subtotal: 1000,
            item_tax_total: 75,
            shipping_subtotal: 200,
            shipping_tax_total: 15,
            total: 1290,
          });
          expect(Number((await collection(cart.collectionId)).amount)).toBe(
            1290,
          );
          expect([...initialized.values()]).toEqual([129000]);
          expect((await fixture.stock()).reservations).toHaveLength(0);
          const first = await completeCartWorkflow(container).run({
            input: { id: cart.id },
          });
          const replay = await completeCartWorkflow(container).run({
            input: { id: cart.id },
          });
          expect(replay.result.id).toBe(first.result.id);
          const order = await container
            .resolve(Modules.ORDER)
            .retrieveOrder(first.result.id, {
              relations: [
                "items",
                "shipping_methods",
                "items.tax_lines",
                "shipping_methods.tax_lines",
              ],
            });
          expect(Number(order.total)).toBe(1290);
          expect(Number(order.tax_total)).toBe(90);
          const stock = await fixture.stock();
          expect(stock.reservations).toHaveLength(1);
          expect(stock.reservations[0].line_item_id).toBe(order.items![0].id);
          expect(Number(stock.level.stocked_quantity)).toBe(1);
          expect(Number(stock.level.reserved_quantity)).toBe(1);
          expect(Number(stock.level.available_quantity)).toBe(0);
          const paid = await collection(cart.collectionId);
          expect(paid.payments).toHaveLength(1);
          expect(paid.payments![0].captures).toHaveLength(1);
          expect(Number(paid.payments![0].captures![0].amount)).toBe(1290);
        },
      );

      it("rejects a physical cart without shipping before authorizing payment", async () => {
        const fixture = await physicalCheckoutFixture(getContainer());
        const cart = await fixture.cart(false);
        await expect(
          completeCartWorkflow(getContainer()).run({ input: { id: cart.id } }),
        ).rejects.toMatchObject({
          message: expect.stringContaining("No shipping method selected"),
        });
        await expectUncompleted(cart.id, cart.collectionId);
        expect((await fixture.stock()).reservations).toHaveLength(0);
        expect(verificationCalls()).toHaveLength(0);
      });

      it("releases reservations after underpayment and allows a correctly paid retry", async () => {
        const container = getContainer();
        const fixture = await physicalCheckoutFixture(container);
        const cart = await fixture.cart();
        paidAmount = 100000;
        await expect(
          completeCartWorkflow(container).run({ input: { id: cart.id } }),
        ).rejects.toMatchObject({
          message: expect.stringContaining("does not match"),
        });
        await expectUncompleted(cart.id, cart.collectionId);
        expect(
          await container.resolve(Modules.ORDER).listOrders({}),
        ).toHaveLength(0);
        const stock = await fixture.stock();
        expect(stock.reservations).toHaveLength(0);
        expect(Number(stock.level.available_quantity)).toBe(1);
        paidAmount = undefined;
        await completeCartWorkflow(container).run({ input: { id: cart.id } });
        expect((await storedCart(cart.id)).completed_at).not.toBeNull();
        expect((await fixture.stock()).reservations).toHaveLength(1);
        expect((await collection(cart.collectionId)).payments).toHaveLength(1);
      });

      it("rechecks stock at completion when stock disappears after cart creation", async () => {
        const container = getContainer();
        const fixture = await physicalCheckoutFixture(container);
        const cart = await fixture.cart();
        await container.resolve(Modules.INVENTORY).updateInventoryLevels({
          inventory_item_id: fixture.inventoryItemId,
          location_id: fixture.locationId,
          stocked_quantity: 0,
        });
        await expect(
          completeCartWorkflow(container).run({ input: { id: cart.id } }),
        ).rejects.toMatchObject({
          message: expect.stringMatching(/inventory|stock/i),
        });
        await expectUncompleted(cart.id, cart.collectionId);
        expect((await fixture.stock()).reservations).toHaveLength(0);
        expect(verificationCalls()).toHaveLength(0);
      });

      it("allows only one of two competing carts to purchase the last unit", async () => {
        const container = getContainer();
        const fixture = await physicalCheckoutFixture(container);
        const carts = [await fixture.cart(), await fixture.cart()];
        const results = await Promise.allSettled(
          carts.map((cart) =>
            completeCartWorkflow(container).run({ input: { id: cart.id } }),
          ),
        );
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        const loserIndex = results.findIndex(
          (result) => result.status === "rejected",
        );
        expect(results[loserIndex]).toMatchObject({
          reason: { message: expect.stringMatching(/inventory|stock/i) },
        });
        await expectUncompleted(
          carts[loserIndex].id,
          carts[loserIndex].collectionId,
        );
        expect(
          await container.resolve(Modules.ORDER).listOrders({}),
        ).toHaveLength(1);
        const stock = await fixture.stock();
        expect(stock.reservations).toHaveLength(1);
        expect(Number(stock.level.reserved_quantity)).toBe(1);
        expect(Number(stock.level.available_quantity)).toBe(0);
        const payments = await container
          .resolve(Modules.PAYMENT)
          .listPayments({}, { relations: ["captures"] });
        expect(payments).toHaveLength(1);
        expect(payments[0].captures).toHaveLength(1);
        expect(Number(payments[0].captures![0].amount)).toBe(1290);
      });
    });
  },
});
