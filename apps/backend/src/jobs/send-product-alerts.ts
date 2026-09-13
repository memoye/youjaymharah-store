import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { sendDueProductAlertsWorkflow } from "../workflows/product-alerts";

/**
 * Emails shoppers whose sold-out or coming-soon item can now be bought. Only
 * waiting alerts are checked, so a run with none costs one query.
 */
export default async function sendProductAlerts(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const { result } = await sendDueProductAlertsWorkflow(container).run();

  if (result.sent || result.failed || result.cancelled) {
    logger.info(
      `product-alerts: sent ${result.sent}, failed ${result.failed} (${result.given_up} given up after repeated failures), cancelled ${result.cancelled} (product or size deleted).`,
    );
  }
}

export const config = {
  name: "send-product-alerts",
  schedule: "*/10 * * * *", // Every 10 minutes
};
