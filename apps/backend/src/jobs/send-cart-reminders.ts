import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendDueCartRemindersWorkflow } from "../workflows/cart-reminders";

/**
 * Emails shoppers about carts they left, per Settings -> Bag reminders. While
 * reminders are off, a run costs one settings read.
 */
export default async function sendCartReminders(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const { result } = await sendDueCartRemindersWorkflow(container).run();

  if (result.sent || result.failed) {
    logger.info(
      `cart-reminders: sent ${result.sent}, failed ${result.failed} (${result.given_up} given up after repeated failures), ${result.finished} finished.`,
    );
  }
}

export const config = {
  name: "send-cart-reminders",
  schedule: "*/10 * * * *", // Every 10 minutes
};
