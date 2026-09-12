import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendOrderShippedEmailStep,
  type SendOrderShippedEmailInput,
} from "./steps/send-order-shipped-email";

/**
 * Runs on shipment.created through the subscriber, i.e. when staff click
 * "Mark as shipped" in the admin. Kept in a workflow so the send is retried
 * on transient failures, like the other transactional emails.
 */
export const sendOrderShippedEmailWorkflow = createWorkflow(
  "send-order-shipped-email",
  function (input: SendOrderShippedEmailInput) {
    const result = sendOrderShippedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
