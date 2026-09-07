import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  IUserModuleService,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { BRANDING_MODULE } from "../modules/branding";
import type BrandingModuleService from "../modules/branding/service";
import { EmailTemplates } from "../modules/resend/emails";
import { ADMIN_URL } from "../modules/resend/emails/constants";

export default async function inviteCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService: IUserModuleService = container.resolve(Modules.USER);
  const notificationModuleService: INotificationModuleService =
    container.resolve(Modules.NOTIFICATION);
  const brandingModuleService: BrandingModuleService =
    container.resolve(BRANDING_MODULE);

  const invite = await userModuleService.retrieveInvite(data.id);

  if (!invite) {
    logger.warn(`${eventName}: invite ${data.id} could not be retrieved.`);
    return;
  }

  if (invite.accepted) {
    logger.info(`${eventName}: invite ${invite.id} is already accepted.`);
    return;
  }

  // The admin dashboard reads the token off the query string on this route.
  const url = `${ADMIN_URL}/app/invite?token=${encodeURIComponent(invite.token)}`;

  const brand = await brandingModuleService.retrieveSettings();

  try {
    await notificationModuleService.createNotifications({
      to: invite.email,
      channel: "email",
      template: EmailTemplates.INVITE_USER,
      data: {
        url,
        email: invite.email,
        brand,
      },
    });

    logger.info(`${eventName}: invite email sent to ${invite.email}.`);
  } catch (error) {
    // NOTE: swallowed on purpose, as in order-placed. The in-memory event bus
    // ignores retry attempts, so rethrowing buys nothing; the invite itself
    // still exists and can be resent from the admin.
    logger.error(
      `${eventName}: failed to send invite email to ${invite.email}: ${
        (error as Error).message
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  // "resent" fires when an admin clicks resend, which refreshes the token --
  // without it a resent invite would carry a stale link or none at all.
  event: ["invite.created", "invite.resent"],
};
