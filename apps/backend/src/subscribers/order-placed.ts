import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendOrderConfirmationWorkflow } from "../workflows/order-confirmation";

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery from here. A failed
  // send is retried per the step's maxRetries/retryInterval (durably, across
  // restarts, with the Redis workflow engine), so rethrowing here would only
  // risk surfacing a mail failure as an order failure.
  try {
    await sendOrderConfirmationWorkflow(container).run({
      input: { id: data.id },
    });
  } catch (error) {
    logger.warn(
      `order.placed: confirmation for order ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
