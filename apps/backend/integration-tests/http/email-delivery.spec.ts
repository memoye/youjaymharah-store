import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import type { INotificationModuleService } from "@medusajs/framework/types";
import { EMAIL_DELIVERY_MODULE } from "../../src/modules/email-delivery";
import type EmailDeliveryModuleService from "../../src/modules/email-delivery/service";
import { emailIdempotency } from "../../src/modules/resend/idempotency";
import { requireIsolatedDatabase } from "../helpers/isolated-database";

requireIsolatedDatabase();
jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  inApp: true,
  dbName: "medusa-email-delivery-integration",
  testSuite: ({ getContainer }) => {
    describe("durable email acceptance", () => {
      const originalFetch = global.fetch;
      afterEach(() => {
        global.fetch = originalFetch;
      });
      const notification = () => ({
        to: "buyer@example.com",
        channel: "email",
        template: "inline-integration",
        content: { html: "private reset token", subject: "Integration" },
        ...emailIdempotency("integration:delivery"),
      });

      it("wires the provider to persistent storage and deduplicates concurrent attempts", async () => {
        global.fetch = jest
          .fn()
          .mockImplementation(
            async () =>
              new Response(JSON.stringify({ id: "provider_email_one" })),
          );
        const notifications: INotificationModuleService =
          getContainer().resolve(Modules.NOTIFICATION);
        await Promise.all([
          notifications.createNotifications(notification()),
          notifications.createNotifications(notification()),
        ]);
        const deliveries: EmailDeliveryModuleService = getContainer().resolve(
          EMAIL_DELIVERY_MODULE,
        );
        const rows = await deliveries.listEmailDeliveries({});
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          status: "accepted",
          provider_id: "provider_email_one",
          payload_ciphertext: null,
          attempts: 1,
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        await deliveries.updateEmailDeliveries({
          id: rows[0].id,
          first_attempt_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
        });
        await notifications.createNotifications(notification());
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("persists uncertainty and blocks stale sends without making another provider request", async () => {
        global.fetch = jest
          .fn()
          .mockRejectedValue(new Error("provider timeout"));
        const notifications: INotificationModuleService =
          getContainer().resolve(Modules.NOTIFICATION);
        // Medusa persists a failed notification; the provider still records its attempt.
        await notifications
          .createNotifications(notification())
          .catch(() => undefined);
        const deliveries: EmailDeliveryModuleService = getContainer().resolve(
          EMAIL_DELIVERY_MODULE,
        );
        const [row] = await deliveries.listEmailDeliveries({});
        expect(row.status).toBe("attempted");
        expect(row.payload_ciphertext).not.toContain("private reset token");
        await deliveries.updateEmailDeliveries({
          id: row.id,
          first_attempt_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });
        await notifications
          .createNotifications(notification())
          .catch(() => undefined);
        expect((await deliveries.retrieveEmailDelivery(row.id)).status).toBe(
          "needs_review",
        );
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  },
});
