import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendOrderShippedEmailWorkflow } from "../workflows/send-order-shipped-email";

export default async function shipmentCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // The admin's "Send notifications" switch on Mark as shipped arrives here as
  // no_notification; switched off means staff chose not to email the customer.
  if (data.no_notification) {
    logger.info(
      `${eventName}: notifications disabled for fulfillment ${data.id}; no email sent.`,
    );
    return;
  }

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendOrderShippedEmailWorkflow(container).run({
      input: { fulfillment_id: data.id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: shipping email for fulfillment ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};
