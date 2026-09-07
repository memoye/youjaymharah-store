import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { BRANDING_MODULE } from "../modules/branding";
import type BrandingModuleService from "../modules/branding/service";
import { EmailTemplates } from "../modules/resend/emails";

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModuleService: INotificationModuleService =
    container.resolve(Modules.NOTIFICATION);
  const brandingModuleService: BrandingModuleService =
    container.resolve(BRANDING_MODULE);

  const { data: orders } = await query.graph({
    entity: "order",
    // These are exactly the fields the order-placed template reads. Adding a
    // field to the template means adding it here, or it renders as undefined.
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "item_total",
      "tax_total",
      "customer.*",
      "shipping_address.*",
      "items.*",
      "shipping_methods.*",
    ],
    filters: { id: data.id },
  });

  const order = orders[0];

  if (!order) {
    logger.warn(`order.placed: order ${data.id} could not be retrieved.`);
    return;
  }

  const recipient = order.email ?? order.customer?.email;

  if (!recipient) {
    logger.warn(
      `order.placed: order ${order.id} has no email address; skipping confirmation.`,
    );
    return;
  }

  const brand = await brandingModuleService.retrieveSettings();

  try {
    await notificationModuleService.createNotifications({
      to: recipient,
      channel: "email",
      template: EmailTemplates.ORDER_PLACED,
      data: { order, brand },
    });

    logger.info(
      `order.placed: confirmation sent to ${recipient} for order #${order.display_id}.`,
    );
  } catch (error) {
    // NOTE: swallowed on purpose. Subscribers run on the in-memory event bus,
    // which ignores the retry `attempts` Medusa asks for, so rethrowing buys no
    // second attempt -- it only risks surfacing a mail failure as an order
    // failure. A missing confirmation email must never look like a failed
    // order. Acceptable at current scale; see the no-Redis stance before
    // reaching for a queue.
    logger.error(
      `order.placed: failed to send confirmation for order ${order.id}: ${
        (error as Error).message
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
