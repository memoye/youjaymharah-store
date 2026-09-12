import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendPasswordResetEmailWorkflow } from "../workflows/send-password-reset-email";

type PasswordResetEvent = {
  /** The identifier being reset -- an email address for both actor types. */
  entity_id: string;
  /** "customer", "user", or a custom actor type. */
  actor_type: string;
  token: string;
  metadata?: Record<string, unknown>;
};

export default async function passwordResetHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendPasswordResetEmailWorkflow(container).run({
      input: {
        email: data.entity_id,
        token: data.token,
        actor_type: data.actor_type,
      },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: reset email for ${data.entity_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
