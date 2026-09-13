import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendReturnRequestedEmailStep,
  type SendReturnRequestedEmailInput,
} from "./steps/send-return-requested-email";

/**
 * Runs on order.return_requested through the subscriber, i.e. when staff
 * confirm a return in the admin. Kept in a workflow so the send is retried on
 * transient failures, like the other transactional emails.
 */
export const sendReturnRequestedEmailWorkflow = createWorkflow(
  "send-return-requested-email",
  function (input: SendReturnRequestedEmailInput) {
    const result = sendReturnRequestedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
