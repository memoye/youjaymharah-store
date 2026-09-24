import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { emailIdempotency } from "../../modules/resend/idempotency";
import type { PreparedEmail } from "./send-prepared-email";
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

export const preparePasswordResetEmailStep = createStep(
  {
    name: "prepare-password-reset-email",
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendPasswordResetEmailInput, { container }) => {
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
    const path = isCustomer ? "/account/reset-password" : "/reset-password";

    const url =
      `${base}${path}` +
      `?token=${encodeURIComponent(input.token)}` +
      `&email=${encodeURIComponent(input.email)}`;

    const brand = await brandingModuleService.retrieveSettings();

    return new StepResponse<PreparedEmail<SendPasswordResetEmailOutput>>({
      notification: {
        to: input.email,
        channel: "email",
        template: EmailTemplates.PASSWORD_RESET,
        ...emailIdempotency(
          JSON.stringify([
            "password-reset",
            input.actor_type,
            input.email,
            input.token,
          ]),
        ),
        data: { url, email: input.email, brand },
      },
      result: {
        sent_to: input.email,
        actor_type: input.actor_type,
      },
    });
  },
);
