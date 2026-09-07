import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { BRANDING_MODULE } from "../modules/branding";
import type BrandingModuleService from "../modules/branding/service";
import { EmailTemplates } from "../modules/resend/emails";
import { ADMIN_URL, STOREFRONT_URL } from "../modules/resend/emails/constants";

type PasswordResetEvent = {
  /** The identifier being reset -- an email address for both actor types. */
  entity_id: string;
  /** "customer", "user", or a custom actor type. */
  actor_type: string;
  token: string;
  metadata?: Record<string, unknown>;
};

export default async function passwordResetHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const notificationModuleService: INotificationModuleService =
    container.resolve(Modules.NOTIFICATION);
  const brandingModuleService: BrandingModuleService =
    container.resolve(BRANDING_MODULE);

  const { entity_id: email, actor_type: actorType, token } = data;

  if (!email || !token) {
    logger.warn(
      `${eventName}: event is missing entity_id or token; cannot build a reset link.`,
    );
    return;
  }

  // Staff reset inside the admin dashboard; shoppers reset on the storefront.
  const isCustomer = actorType === "customer";
  const base = isCustomer ? STOREFRONT_URL : ADMIN_URL;
  const path = isCustomer ? "/account/reset-password" : "/app/reset-password";

  const url =
    `${base}${path}` +
    `?token=${encodeURIComponent(token)}` +
    `&email=${encodeURIComponent(email)}`;

  const brand = await brandingModuleService.retrieveSettings();

  try {
    await notificationModuleService.createNotifications({
      to: email,
      channel: "email",
      template: EmailTemplates.PASSWORD_RESET,
      data: {
        url,
        email,
        brand,
      },
    });

    logger.info(`${eventName}: reset email sent to ${email} (${actorType}).`);
  } catch (error) {
    // NOTE: swallowed on purpose, as in order-placed. No retry exists on the
    // in-memory event bus, and the customer can request another reset.
    logger.error(
      `${eventName}: failed to send reset email to ${email}: ${
        (error as Error).message
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
