import type { IUserModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { emailIdempotency } from "../../modules/resend/idempotency";
import type { PreparedEmail } from "./send-prepared-email";
import { ADMIN_URL } from "../../modules/resend/emails/constants";

export type SendInviteEmailInput = { id: string };

export type SendInviteEmailOutput = {
  invite_id: string;
  sent_to: string | null;
};

export const prepareInviteEmailStep = createStep(
  {
    name: "prepare-invite-email",
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendInviteEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const userModuleService: IUserModuleService = container.resolve(
      Modules.USER,
    );
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);

    const invite = await userModuleService.retrieveInvite(input.id);

    if (!invite) {
      return StepResponse.permanentFailure(
        `send-invite-email: invite ${input.id} could not be retrieved.`,
      );
    }

    if (invite.accepted) {
      // Nothing to send, and no point retrying: the person is already in.
      logger.info(
        `send-invite-email: invite ${invite.id} is already accepted.`,
      );
      return new StepResponse<PreparedEmail<SendInviteEmailOutput>>({
        notification: null,
        result: {
          invite_id: invite.id,
          sent_to: null,
        },
      });
    }

    // The admin dashboard reads the token off the query string on this route.
    const url = `${ADMIN_URL}/app/invite?token=${encodeURIComponent(invite.token)}`;
    const brand = await brandingModuleService.retrieveSettings();

    return new StepResponse<PreparedEmail<SendInviteEmailOutput>>({
      notification: {
        to: invite.email,
        channel: "email",
        template: EmailTemplates.INVITE_USER,
        ...emailIdempotency(
          JSON.stringify(["invite", invite.id, invite.email, invite.token]),
        ),
        data: { url, email: invite.email, brand },
      },
      result: {
        invite_id: invite.id,
        sent_to: invite.email,
      },
    });
  },
);
