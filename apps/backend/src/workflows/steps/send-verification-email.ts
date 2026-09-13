import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { STOREFRONT_URL } from "../../modules/resend/emails/constants";

export type SendVerificationEmailInput = {
  email: string;
  /** The single-use verification token from auth.verification_requested. */
  token: string;
  expires_at?: string | Date | null;
};

export type SendVerificationEmailOutput = {
  sent_to: string;
};

/** "15 minutes" from an expiry timestamp, or undefined when unknown or past. */
function describeExpiry(expiresAt?: string | Date | null): string | undefined {
  if (!expiresAt) {
    return undefined;
  }

  const minutes = Math.round(
    (new Date(expiresAt).getTime() - Date.now()) / 60_000,
  );

  if (!Number.isFinite(minutes) || minutes < 1) {
    return undefined;
  }

  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export const sendVerificationEmailStep = createStep(
  {
    name: "send-verification-email",
    // Transient Resend/network failures are retried by the workflow engine.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendVerificationEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    // The storefront page at this path posts the token to
    // POST /auth/verification/confirm as `code`. Change the path here if the
    // storefront uses a different route.
    const url = `${STOREFRONT_URL.replace(/\/$/, "")}/account/verify?token=${encodeURIComponent(input.token)}`;

    const brand = await brandingModuleService.retrieveSettings();

    // Deliberately not caught: a throw is what schedules the retry.
    await notificationModuleService.createNotifications({
      to: input.email,
      channel: "email",
      template: EmailTemplates.EMAIL_VERIFICATION,
      data: {
        url,
        email: input.email,
        expires_in: describeExpiry(input.expires_at),
        brand,
      },
    });

    // The token itself is never logged.
    logger.info(
      `send-verification-email: verification email sent to ${input.email}.`,
    );

    return new StepResponse<SendVerificationEmailOutput>({
      sent_to: input.email,
    });
  },
);
