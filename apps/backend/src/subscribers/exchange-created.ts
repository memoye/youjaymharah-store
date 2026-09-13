import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendExchangeCreatedEmailWorkflow } from "../workflows/send-exchange-created-email";

export default async function exchangeCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ order_id: string; exchange_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendExchangeCreatedEmailWorkflow(container).run({
      input: { exchange_id: data.exchange_id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: exchange email for exchange ${data.exchange_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.exchange_created",
};
