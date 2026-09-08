import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import NewsletterModuleService, {
  NEWSLETTER_SETTINGS_ID,
} from "../../modules/newsletter/service";

export type UpdateNewsletterSettingsInput = {
  enabled?: boolean;
  audience_id?: string | null;
  double_opt_in?: boolean;
  consent_text?: string | null;
  success_message?: string | null;
  reply_to?: string | null;
  checkout_opt_in?: boolean;
  checkout_label?: string | null;
};

export const updateNewsletterSettingsStep = createStep(
  "update-newsletter-settings",
  async (input: UpdateNewsletterSettingsInput, { container }) => {
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    // Reads through retrieveSettings so the row exists before the first edit.
    const previous = await service.retrieveSettings();

    const [updated] = await service.updateNewsletterSettings([
      { id: NEWSLETTER_SETTINGS_ID, ...input },
    ]);

    return new StepResponse(updated, {
      enabled: previous.enabled,
      audience_id: previous.audience_id,
      double_opt_in: previous.double_opt_in,
      consent_text: previous.consent_text,
      success_message: previous.success_message,
      reply_to: previous.reply_to,
      checkout_opt_in: previous.checkout_opt_in,
      checkout_label: previous.checkout_label,
    });
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    await service.updateNewsletterSettings([
      { id: NEWSLETTER_SETTINGS_ID, ...previous },
    ]);
  },
);
