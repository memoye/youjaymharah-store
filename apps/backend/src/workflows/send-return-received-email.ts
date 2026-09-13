import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendReturnReceivedEmailStep,
  type SendReturnReceivedEmailInput,
} from "./steps/send-return-received-email";

/**
 * Runs on order.return_received through the subscriber, i.e. when staff
 * receive a return's items in the admin. Kept in a workflow so the send is
 * retried on transient failures, like the other transactional emails.
 */
export const sendReturnReceivedEmailWorkflow = createWorkflow(
  "send-return-received-email",
  function (input: SendReturnReceivedEmailInput) {
    const result = sendReturnReceivedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
