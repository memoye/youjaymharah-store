import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendReturnReceivedEmailWorkflow } from "../workflows/send-return-received-email";

export default async function returnReceivedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ order_id: string; return_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendReturnReceivedEmailWorkflow(container).run({
      input: { return_id: data.return_id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: return receipt for return ${data.return_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.return_received",
};
