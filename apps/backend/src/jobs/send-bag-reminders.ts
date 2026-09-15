import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendDueBagRemindersWorkflow } from "../workflows/bag-reminders";

/**
 * Emails shoppers about bags they left, per Settings -> Bag reminders. While
 * reminders are off, a run costs one settings read.
 */
export default async function sendBagReminders(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const { result } = await sendDueBagRemindersWorkflow(container).run();

  if (result.sent || result.failed) {
    logger.info(
      `bag-reminders: sent ${result.sent}, failed ${result.failed} (${result.given_up} given up after repeated failures), ${result.finished} finished.`,
    );
  }
}

export const config = {
  name: "send-bag-reminders",
  schedule: "*/10 * * * *", // Every 10 minutes
};
