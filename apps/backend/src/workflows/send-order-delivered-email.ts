import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendOrderDeliveredEmailStep,
  type SendOrderDeliveredEmailInput,
} from "./steps/send-order-delivered-email";

/**
 * Runs on delivery.created through the subscriber, i.e. when staff click
 * "Mark as delivered" in the admin. Kept in a workflow so the send is retried
 * on transient failures, like the other transactional emails.
 */
export const sendOrderDeliveredEmailWorkflow = createWorkflow(
  "send-order-delivered-email",
  function (input: SendOrderDeliveredEmailInput) {
    const result = sendOrderDeliveredEmailStep(input);

    return new WorkflowResponse(result);
  },
);
