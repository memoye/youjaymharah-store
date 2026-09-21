import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendRefundIssuedEmailWorkflow } from "../workflows/send-refund-issued-email";

export default async function refundCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendRefundIssuedEmailWorkflow(container).run({
      input: { refund_id: data.id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: email for refund ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  // Unlike payment.refunded, this module event identifies the specific refund.
  event: "payment.refund.created",
};
