import type {
  INotificationModuleService,
  IUserModuleService,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { ADMIN_URL } from "../../modules/resend/emails/constants";

export type SendInviteEmailInput = { id: string };

export type SendInviteEmailOutput = {
  invite_id: string;
  sent_to: string | null;
};

export const sendInviteEmailStep = createStep(
  {
    name: "send-invite-email",
    // Transient Resend/network failures are retried by the workflow engine.
    // Permanent conditions below use StepResponse.permanentFailure instead, so
    // they fail immediately rather than burning five attempts.
    maxRetries: 5,
    retryInterval: 15,
  },
  async (input: SendInviteEmailInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const userModuleService: IUserModuleService = container.resolve(
      Modules.USER,
    );
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
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
      return new StepResponse<SendInviteEmailOutput>({
        invite_id: invite.id,
        sent_to: null,
      });
    }

    // The admin dashboard reads the token off the query string on this route.
    const url = `${ADMIN_URL}/app/invite?token=${encodeURIComponent(invite.token)}`;
    const brand = await brandingModuleService.retrieveSettings();

    // Deliberately not caught: a throw is what schedules the retry.
    await notificationModuleService.createNotifications({
      to: invite.email,
      channel: "email",
      template: EmailTemplates.INVITE_USER,
      data: { url, email: invite.email, brand },
    });

    logger.info(`send-invite-email: invite email sent to ${invite.email}.`);

    return new StepResponse<SendInviteEmailOutput>({
      invite_id: invite.id,
      sent_to: invite.email,
    });
  },
);
