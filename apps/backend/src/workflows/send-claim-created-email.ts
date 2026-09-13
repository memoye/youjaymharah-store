import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendClaimCreatedEmailStep,
  type SendClaimCreatedEmailInput,
} from "./steps/send-claim-created-email";

/**
 * Runs on order.claim_created through the subscriber, i.e. when staff confirm
 * a claim in the admin. Kept in a workflow so the send is retried on transient
 * failures, like the other transactional emails.
 */
export const sendClaimCreatedEmailWorkflow = createWorkflow(
  "send-claim-created-email",
  function (input: SendClaimCreatedEmailInput) {
    const result = sendClaimCreatedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
