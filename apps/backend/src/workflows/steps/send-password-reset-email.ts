import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import {
  ADMIN_URL,
  STOREFRONT_URL,
} from "../../modules/resend/emails/constants";

export type SendPasswordResetEmailInput = {
  email: string;
  token: string;
  actor_type: string;
};

export type SendPasswordResetEmailOutput = {
  sent_to: string;
  actor_type: string;
};

export const sendPasswordResetEmailStep = createStep(
  {
    name: "send-password-reset-email",
    // A lost reset email locks someone out with no recourse but to start over,
    // so this is the send most worth retrying.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendPasswordResetEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    if (!input.email || !input.token) {
      // Malformed event: retrying cannot conjure the missing fields.
      return StepResponse.permanentFailure(
        "send-password-reset-email: event is missing entity_id or token; cannot build a reset link.",
      );
    }

    // Staff reset inside the admin dashboard; shoppers on the storefront.
    const isCustomer = input.actor_type === "customer";
    const base = isCustomer ? STOREFRONT_URL : ADMIN_URL;
    const path = isCustomer ? "/account/reset-password" : "/app/reset-password";

    const url =
      `${base}${path}` +
      `?token=${encodeURIComponent(input.token)}` +
      `&email=${encodeURIComponent(input.email)}`;

    const brand = await brandingModuleService.retrieveSettings();

    // Deliberately not caught: a throw is what schedules the retry.
    await notificationModuleService.createNotifications({
      to: input.email,
      channel: "email",
      template: EmailTemplates.PASSWORD_RESET,
      data: { url, email: input.email, brand },
    });

    logger.info(
      `send-password-reset-email: reset email sent to ${input.email} (${input.actor_type}).`,
    );

    return new StepResponse<SendPasswordResetEmailOutput>({
      sent_to: input.email,
      actor_type: input.actor_type,
    });
  },
);
