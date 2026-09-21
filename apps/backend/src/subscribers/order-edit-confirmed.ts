import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendOrderUpdatedEmailWorkflow } from "../workflows/send-order-updated-email";

export default async function orderEditConfirmedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{
  order_id: string;
  actions: { id: string }[];
  no_notification?: boolean;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // The admin's "Send notification" switch on an order edit is stored on the
  // edit and arrives here as no_notification.
  if (data.no_notification) {
    logger.info(
      `${eventName}: notifications disabled for the edit on order ${data.order_id}; no email sent.`,
    );
    return;
  }

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendOrderUpdatedEmailWorkflow(container).run({
      input: {
        order_id: data.order_id,
        action_ids: data.actions?.map((action) => action.id) ?? [],
      },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: order update email for order ${data.order_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order-edit.confirmed",
};
