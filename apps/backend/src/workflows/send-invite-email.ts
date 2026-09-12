import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendInviteEmailStep,
  type SendInviteEmailInput,
} from "./steps/send-invite-email";

/**
 * Runs on invite.created and invite.resent through the subscriber. Keeping the
 * send in a workflow is what makes retries work: the workflow engine tracks the
 * step and re-runs it on schedule, and with the Redis workflow engine the retry
 * survives process restarts and deploys.
 */
export const sendInviteEmailWorkflow = createWorkflow(
  "send-invite-email",
  function (input: SendInviteEmailInput) {
    const result = sendInviteEmailStep(input);

    return new WorkflowResponse(result);
  },
);
