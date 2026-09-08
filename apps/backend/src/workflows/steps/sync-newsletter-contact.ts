import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import { ResendAudienceClient } from "../../modules/newsletter/resend-audience";
import type NewsletterModuleService from "../../modules/newsletter/service";

export type SyncNewsletterContactInput = {
  subscriber_id: string;
  email: string;
  action: "subscribe" | "unsubscribe";
  /** Skip without failing, e.g. while a double opt-in is still pending. */
  skip?: boolean;
};

/**
 * Pushes membership to the configured Resend audience.
 *
 * Deliberately non-fatal: a Resend outage must not cost us the consent record
 * we already hold. The subscriber row is the source of truth, and a failed
 * sync is logged for a later reconciliation pass rather than rolling back the
 * signup the customer just completed.
 */
export const syncNewsletterContactStep = createStep(
  "sync-newsletter-contact",
  async (input: SyncNewsletterContactInput, { container }) => {
    if (input.skip) {
      return new StepResponse(null);
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    const settings = await service.retrieveSettings();

    if (!settings.audience_id) {
      logger.warn(
        `newsletter: no Resend audience configured; ${input.email} was recorded but not synced.`,
      );
      return new StepResponse(null);
    }

    const client = new ResendAudienceClient();

    try {
      if (input.action === "unsubscribe") {
        await client.unsubscribeContact({
          audienceId: settings.audience_id,
          email: input.email,
        });
        return new StepResponse(null);
      }

      const contactId = await client.addContact({
        audienceId: settings.audience_id,
        email: input.email,
      });

      if (contactId) {
        await service.updateNewsletterSubscribers([
          { id: input.subscriber_id, resend_contact_id: contactId },
        ]);
      }

      return new StepResponse(contactId ?? null);
    } catch (error) {
      logger.error(
        `newsletter: Resend sync failed for ${input.email}: ${(error as Error).message}`,
      );
      return new StepResponse(null);
    }
  },
);
