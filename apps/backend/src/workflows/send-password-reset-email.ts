import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendPasswordResetEmailStep,
  type SendPasswordResetEmailInput,
} from "./steps/send-password-reset-email";

/**
 * Runs on auth.password_reset through the subscriber. The workflow engine owns
 * delivery and retries, so a transient mail outage does not silently strand
 * someone outside their own account.
 */
export const sendPasswordResetEmailWorkflow = createWorkflow(
  "send-password-reset-email",
  function (input: SendPasswordResetEmailInput) {
    const result = sendPasswordResetEmailStep(input);

    return new WorkflowResponse(result);
  },
);
