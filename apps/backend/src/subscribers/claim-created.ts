import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendClaimCreatedEmailWorkflow } from "../workflows/send-claim-created-email";

export default async function claimCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ order_id: string; claim_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendClaimCreatedEmailWorkflow(container).run({
      input: { claim_id: data.claim_id },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: claim email for claim ${data.claim_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.claim_created",
};
