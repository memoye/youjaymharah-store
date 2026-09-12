import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendInviteEmailWorkflow } from "../workflows/send-invite-email";

export default async function inviteCreatedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery from here. A failed
  // send is retried per the step's maxRetries/retryInterval, so rethrowing
  // would only risk surfacing a mail failure as a failed invite.
  try {
    await sendInviteEmailWorkflow(container).run({ input: { id: data.id } });
  } catch (error) {
    logger.warn(
      `${eventName}: invite email for ${data.id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  // "resent" fires when an admin clicks resend, which refreshes the token --
  // without it a resent invite would carry a stale link or none at all.
  event: ["invite.created", "invite.resent"],
};
