import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { INotificationModuleService } from "@medusajs/framework/types";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";
import { STOREFRONT_URL } from "../../modules/resend/emails/constants";
import { emailIdempotency } from "../../modules/resend/idempotency";

export type SendNewsletterEmailInput = {
  email: string;
  token: string;
  confirmation_token?: string;
  template: string;
  /** Skip sending without failing the workflow, e.g. for a repeat signup. */
  skip?: boolean;
};

export const sendNewsletterEmailStep = createStep(
  {
    name: "send-newsletter-email",
    // Transient Resend/network failures are retried by the workflow engine.
    // This matters most for the confirm email: without it a double opt-in
    // signup is stranded as `pending` with no way for the subscriber to
    // complete, and no record that anything went wrong.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendNewsletterEmailInput, { container }) => {
    if (input.skip) {
      return new StepResponse(null);
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);
    const newsletterModuleService: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    const [subscriber] =
      await newsletterModuleService.listNewsletterSubscribers({
        email: input.email,
      });
    if (
      !subscriber ||
      subscriber.email_suppressed_at ||
      subscriber.status === "unsubscribed" ||
      subscriber.token !== input.token
    )
      return new StepResponse(null);

    const [brand, settings] = await Promise.all([
      brandingModuleService.retrieveSettings(),
      newsletterModuleService.retrieveSettings(),
    ]);

    const confirmUrl = `${STOREFRONT_URL}/newsletter/confirm?token=${encodeURIComponent(input.confirmation_token ?? "")}`;
    const unsubscribeUrl = `${STOREFRONT_URL}/newsletter/unsubscribe?token=${encodeURIComponent(input.token)}`;

    // Deliberately not caught: a throw is what schedules the retry. The
    // subscriber row is already written, so a retry re-sends the email without
    // touching the consent record.
    await notificationModuleService.createNotifications({
      to: input.email,
      channel: "email",
      template: input.template,
      ...emailIdempotency(`newsletter:${input.template}:${input.token}`),
      data: {
        reply_to: settings.reply_to ?? undefined,
        brand,
        confirm_url: confirmUrl,
        unsubscribe_url: unsubscribeUrl,
      },
    });

    logger.info(`newsletter: sent "${input.template}" to ${input.email}.`);

    return new StepResponse(null);
  },
);
