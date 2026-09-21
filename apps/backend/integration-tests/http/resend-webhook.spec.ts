import { createHmac } from "node:crypto";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { NEWSLETTER_MODULE } from "../../src/modules/newsletter";
import type NewsletterModuleService from "../../src/modules/newsletter/service";

if (
  process.env.MEDUSA_TEST_DB_ISOLATED !== "1" ||
  !["localhost", "127.0.0.1"].includes(process.env.DB_HOST ?? "")
) {
  throw new Error(
    "Integration tests require MEDUSA_TEST_DB_ISOLATED=1 and an explicitly configured localhost PostgreSQL test instance. Never use the application database.",
  );
}

const secretBytes = Buffer.from("isolated-integration-webhook-secret");
const secret = `whsec_${secretBytes.toString("base64")}`;
jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  inApp: true,
  dbName: "medusa-resend-webhook-integration",
  env: { RESEND_WEBHOOK_SECRET: secret },
  testSuite: ({ api, getContainer }) => {
    describe("Resend webhook HTTP and persistence", () => {
      let service: NewsletterModuleService;
      beforeEach(async () => {
        service = getContainer().resolve(NEWSLETTER_MODULE);
        await service.createNewsletterSubscribers([
          {
            email: "webhook@example.com",
            status: "subscribed",
            token: "a".repeat(64),
            consent_at: new Date(Date.now() - 60_000),
            confirmed_at: new Date(Date.now() - 60_000),
          },
        ]);
      });

      function request(
        event: Record<string, unknown>,
        id = "msg_integration",
        rawOverride?: string,
      ) {
        const raw = JSON.stringify(event);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = createHmac("sha256", secretBytes)
          .update(`${id}.${timestamp}.${raw}`)
          .digest("base64");
        return api.post("/webhooks/resend", rawOverride ?? raw, {
          headers: {
            "Content-Type": "application/json",
            "svix-id": id,
            "svix-timestamp": timestamp,
            "svix-signature": `v1,${signature}`,
          },
        });
      }
      const unsubscribe = () => ({
        type: "contact.updated",
        created_at: new Date().toISOString(),
        data: {
          id: "contact",
          email: "webhook@example.com",
          unsubscribed: true,
        },
      });

      it("accepts a signed callback without a customer or publishable key", async () => {
        expect((await request(unsubscribe())).status).toBe(200);
        const [subscriber] = await service.listNewsletterSubscribers({
          email: "webhook@example.com",
        });
        expect(subscriber.status).toBe("unsubscribed");
        expect(subscriber.provider_consent_at).not.toBeNull();
      });

      it("verifies original bytes and rejects a tampered JSON body", async () => {
        const event = unsubscribe();
        await expect(
          request(event, "msg_tampered", JSON.stringify(event) + " "),
        ).rejects.toMatchObject({ response: { status: 400 } });
        expect(await service.listResendWebhookEvents({})).toHaveLength(0);
      });

      it("deduplicates concurrent callbacks in the database", async () => {
        const event = unsubscribe();
        await Promise.all([request(event), request(event)]);
        const receipts = await service.listResendWebhookEvents({});
        expect(receipts).toHaveLength(1);
        expect(receipts[0].processed_at).not.toBeNull();
        expect(receipts[0].payload).toBeNull();
      });

      it("keeps an older provider event from reversing newer consent", async () => {
        await request({
          ...unsubscribe(),
          created_at: new Date(Date.now() - 120_000).toISOString(),
        });
        expect(
          (
            await service.listNewsletterSubscribers({
              email: "webhook@example.com",
            })
          )[0].status,
        ).toBe("subscribed");
      });

      it("records delivery suppression separately from subscription consent", async () => {
        await request({
          type: "email.bounced",
          created_at: new Date().toISOString(),
          data: { to: ["webhook@example.com"], bounce: { type: "Permanent" } },
        });
        const [subscriber] = await service.listNewsletterSubscribers({
          email: "webhook@example.com",
        });
        expect(subscriber.status).toBe("subscribed");
        expect(subscriber.email_suppression_reason).toBe("hard_bounce");
        expect(subscriber.sync_pending).toBe(false);
      });

      it("rejects unsigned requests and anonymous admin access", async () => {
        await expect(
          api.post("/webhooks/resend", unsubscribe()),
        ).rejects.toMatchObject({ response: { status: 400 } });
        await expect(
          api.get("/admin/newsletter/subscribers"),
        ).rejects.toMatchObject({ response: { status: 401 } });
      });
    });
  },
});
