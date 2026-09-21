import type {
  ILockingModule,
  MedusaContainer,
} from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";
import {
  ResendConsentEvent,
  webhookReceiptId,
} from "../../modules/newsletter/resend-webhook";
import { newsletterLockKey } from "../../modules/newsletter/tokens";

export async function processResendWebhook(
  input: ResendConsentEvent,
  container: MedusaContainer,
) {
  const event = ResendConsentEvent.parse(input);
  const service: NewsletterModuleService = container.resolve(NEWSLETTER_MODULE);
  const locking: ILockingModule = container.resolve(Modules.LOCKING);
  const id = webhookReceiptId(event.id);
  await locking.execute(`resend-webhook:${id}`, async () => {
    let [receipt] = await service.listResendWebhookEvents({ id });
    if (receipt?.processed_at) return;
    if (!receipt) {
      [receipt] = await service.createResendWebhookEvents([
        {
          id,
          event_type: event.type,
          occurred_at: new Date(event.occurred_at),
          payload: event,
        },
      ]);
    }
    // A retry uses the original, authenticated receipt, not a replacement payload.
    const saved = ResendConsentEvent.parse(receipt.payload);
    await service.updateResendWebhookEvents([{ id, attempted_at: new Date() }]);
    await locking.execute(newsletterLockKey(saved.email), async () => {
      const [subscriber] = await service.listNewsletterSubscribers({
        email: saved.email,
      });
      if (!subscriber) return;
      if (
        saved.contact_id &&
        subscriber.resend_contact_id &&
        saved.contact_id !== subscriber.resend_contact_id
      )
        return;
      if (saved.audience_id) {
        const settings = await service.retrieveSettings();
        if (saved.audience_id !== settings.audience_id) return;
      }
      const occurredAt = new Date(saved.occurred_at);
      if (saved.action === "unsubscribe") {
        const latestConsent = Math.max(
          ...[
            subscriber.consent_at,
            subscriber.confirmed_at,
            subscriber.provider_consent_at,
            subscriber.unsubscribed_at,
          ].map((date) => (date ? new Date(date).getTime() : 0)),
        );
        if (occurredAt.getTime() < latestConsent) return;
        await service.updateNewsletterSubscribers([
          {
            id: subscriber.id,
            status: "unsubscribed",
            unsubscribed_at: occurredAt,
            provider_consent_at: occurredAt,
            sync_pending: false,
          },
        ]);
      } else if (!subscriber.email_suppressed_at) {
        await service.updateNewsletterSubscribers([
          {
            id: subscriber.id,
            email_suppressed_at: occurredAt,
            email_suppression_reason: saved.action,
            sync_pending: false,
          },
        ]);
      }
    });
    // Keep the deduplication marker but remove addresses from completed receipts.
    await service.updateResendWebhookEvents([
      { id, processed_at: new Date(), payload: null },
    ]);
  });
}

export const processResendWebhookStep = createStep(
  { name: "process-resend-webhook", maxRetries: 5, retryInterval: 15 },
  async (input: ResendConsentEvent, { container }) => {
    await processResendWebhook(input, container);
    return new StepResponse({ received: true });
  },
);
