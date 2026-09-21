import type { MedusaContainer } from "@medusajs/framework/types";
import { processResendWebhook } from "../steps/process-resend-webhook";
import { resolveNewsletterToken } from "../steps/resolve-newsletter-token";
import { confirmationToken } from "../../modules/newsletter/tokens";
import type { ResendConsentEvent } from "../../modules/newsletter/resend-webhook";

function fixture() {
  const receipts = new Map<string, any>();
  const subscriber: any = {
    id: "nlsub_test",
    email: "buyer@example.com",
    token: "a".repeat(64),
    status: "subscribed",
    consent_at: new Date(Date.now() - 60_000),
    confirmed_at: new Date(Date.now() - 60_000),
    email_suppressed_at: null,
  };
  const service = {
    retrieveSettings: jest.fn().mockResolvedValue({ audience_id: "audience" }),
    listResendWebhookEvents: jest.fn(async ({ id }) =>
      receipts.has(id) ? [{ ...receipts.get(id) }] : [],
    ),
    createResendWebhookEvents: jest.fn(async ([row]) => {
      receipts.set(row.id, { ...row });
      return [row];
    }),
    updateResendWebhookEvents: jest.fn(async ([patch]) => {
      Object.assign(receipts.get(patch.id), patch);
    }),
    listNewsletterSubscribers: jest.fn(async () => [{ ...subscriber }]),
    updateNewsletterSubscribers: jest.fn(async ([patch]) => {
      Object.assign(subscriber, patch);
      return [{ ...subscriber }];
    }),
  };
  const queues = new Map<string, Promise<unknown>>();
  const locking = {
    execute: (key: string, job: () => Promise<unknown>) => {
      const result = (queues.get(key) ?? Promise.resolve()).then(job);
      queues.set(
        key,
        result.catch(() => undefined),
      );
      return result;
    },
  };
  const container = {
    resolve: (key: string) => (key === "locking" ? locking : service),
  } as unknown as MedusaContainer;
  const event: ResendConsentEvent = {
    id: "event",
    type: "contact.updated",
    occurred_at: new Date().toISOString(),
    email: subscriber.email,
    action: "unsubscribe",
  };
  return { container, service, subscriber, receipts, event };
}

describe("durable inbound consent", () => {
  it("applies concurrent duplicate deliveries once and removes the saved address", async () => {
    const { container, service, subscriber, receipts, event } = fixture();
    await Promise.all(
      Array.from({ length: 10 }, () => processResendWebhook(event, container)),
    );
    expect(subscriber.status).toBe("unsubscribed");
    expect(subscriber.sync_pending).toBe(false);
    expect(service.updateNewsletterSubscribers).toHaveBeenCalledTimes(1);
    expect([...receipts.values()][0]).toMatchObject({
      payload: null,
      processed_at: expect.any(Date),
    });
  });
  it("retries a failed write from the pending receipt", async () => {
    const { container, service, subscriber, receipts, event } = fixture();
    service.updateNewsletterSubscribers.mockRejectedValueOnce(
      new Error("Database unavailable"),
    );
    await expect(processResendWebhook(event, container)).rejects.toThrow(
      "Database unavailable",
    );
    expect([...receipts.values()][0].processed_at).toBeUndefined();
    await processResendWebhook(event, container);
    expect(subscriber.status).toBe("unsubscribed");
    expect(service.createResendWebhookEvents).toHaveBeenCalledTimes(1);
  });
  it("does not let an old unsubscribe override newer consent", async () => {
    const { container, subscriber, event } = fixture();
    await processResendWebhook(
      { ...event, occurred_at: new Date(Date.now() - 120_000).toISOString() },
      container,
    );
    expect(subscriber.status).toBe("subscribed");
  });
  it("does not recreate unknown subscribers or apply a different audience's event", async () => {
    const { container, service, event } = fixture();
    await processResendWebhook({ ...event, audience_id: "other" }, container);
    expect(service.updateNewsletterSubscribers).not.toHaveBeenCalled();
    service.listNewsletterSubscribers.mockResolvedValueOnce([]);
    await processResendWebhook({ ...event, id: "unknown" }, container);
    expect(service.updateNewsletterSubscribers).not.toHaveBeenCalled();
  });
  it("records a hard bounce separately from consent and prevents confirmation", async () => {
    const { container, subscriber, event } = fixture();
    const token = confirmationToken(subscriber);
    await processResendWebhook(
      { ...event, action: "hard_bounce", type: "email.bounced" },
      container,
    );
    expect(subscriber.status).toBe("subscribed");
    expect(subscriber.email_suppression_reason).toBe("hard_bounce");
    await expect(
      resolveNewsletterToken({ action: "confirm", token }, container),
    ).rejects.toThrow("no longer valid");
  });
  it("an old confirmation link cannot reverse the provider unsubscribe", async () => {
    const { container, subscriber, event } = fixture();
    const token = confirmationToken(subscriber);
    await processResendWebhook(event, container);
    await expect(
      resolveNewsletterToken({ action: "confirm", token }, container),
    ).rejects.toThrow("no longer valid");
  });
});
