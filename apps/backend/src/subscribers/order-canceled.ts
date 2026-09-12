import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendOrderCanceledEmailWorkflow } from "../workflows/send-order-canceled-email";

export default async function orderCanceledHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendOrderCanceledEmailWorkflow(container).run({
      input: { id: data.id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: cancellation email for order ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
};
