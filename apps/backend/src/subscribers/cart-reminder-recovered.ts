import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { markCartRecoveredWorkflow } from "../workflows/cart-reminders";

/**
 * Credits a cart reminder when the reminded cart is checked out, for the
 * results under Settings -> Bag reminders. Separate from the order
 * confirmation subscriber, so neither can hold up the other.
 */
export default async function cartReminderRecoveredHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    await markCartRecoveredWorkflow(container).run({
      input: { order_id: data.id },
    });
  } catch (error) {
    logger.warn(
      `order.placed: could not credit a cart reminder for order ${data.id}: ${
        (error as Error).message
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
