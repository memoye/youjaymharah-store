import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sendVerificationEmailWorkflow } from "../workflows/send-verification-email";

type VerificationRequestedEvent = {
  /** What is being verified -- an email address when entity_type is "email". */
  entity_id: string;
  /** Whatever the caller passed, e.g. "email" or "phone_number". */
  entity_type: string;
  code_provider: string;
  auth_identity_id: string;
  /**
   * The single-use token. Absent when the address was already verified: the
   * token provider then returns the existing verification instead of a new one.
   */
  code?: string;
  expires_at?: string | Date | null;
};

export default async function verificationRequestedHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<VerificationRequestedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (data.entity_type !== "email") {
    logger.info(
      `${eventName}: no email template for ${data.entity_type} verification; nothing sent.`,
    );
    return;
  }

  if (!data.code) {
    logger.info(
      `${eventName}: ${data.entity_id} is already verified; nothing sent.`,
    );
    return;
  }

  // Fire-and-forget: the workflow engine owns delivery and retries from here.
  try {
    await sendVerificationEmailWorkflow(container).run({
      input: {
        email: data.entity_id,
        token: data.code,
        expires_at: data.expires_at,
      },
    });
  } catch (error) {
    logger.warn(
      `${eventName}: verification email for ${data.entity_id} did not complete yet: ${
        (error as Error).message
      }. The workflow engine will keep retrying; inspect it under Settings -> Workflow Executions.`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
};
