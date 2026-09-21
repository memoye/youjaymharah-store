import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { emailIdempotency } from "../../modules/resend/idempotency";
import type { PreparedEmail } from "./send-prepared-email";
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

export const prepareVerificationEmailStep = createStep(
  {
    name: "prepare-verification-email",
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendVerificationEmailInput, { container }) => {
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    if (!input.email || !input.token) {
      return StepResponse.permanentFailure(
        "send-verification-email: missing email or token.",
      );
    }

    // The storefront page at this path posts the token to
    // POST /auth/verification/confirm as `code`. Change the path here if the
    // storefront uses a different route.
    const url = `${STOREFRONT_URL.replace(/\/$/, "")}/account/verify?token=${encodeURIComponent(input.token)}`;

    const brand = await brandingModuleService.retrieveSettings();

    return new StepResponse<PreparedEmail<SendVerificationEmailOutput>>({
      notification: {
        to: input.email,
        channel: "email",
        template: EmailTemplates.EMAIL_VERIFICATION,
        ...emailIdempotency(
          JSON.stringify(["email-verification", input.email, input.token]),
        ),
        data: {
          url,
          email: input.email,
          expires_at: input.expires_at
            ? new Date(input.expires_at).toISOString()
            : undefined,
          brand,
        },
      },
      result: {
        sent_to: input.email,
      },
    });
  },
);
