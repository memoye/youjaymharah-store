import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendOrderDeliveredEmailWorkflow } from "../workflows/send-order-delivered-email";

export default async function deliveryCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Mark as delivered carries the same notification switch as Mark as shipped;
  // switched off means staff chose not to email the customer.
  if (data.no_notification) {
    logger.info(
      `${eventName}: notifications disabled for fulfillment ${data.id}; no email sent.`,
    );
    return;
  }

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendOrderDeliveredEmailWorkflow(container).run({
      input: { fulfillment_id: data.id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: delivery email for fulfillment ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
};
