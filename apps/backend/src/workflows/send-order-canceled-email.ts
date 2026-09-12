import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendOrderCanceledEmailStep,
  type SendOrderCanceledEmailInput,
} from "./steps/send-order-canceled-email";

/**
 * Runs on order.canceled through the subscriber. Kept in a workflow so the
 * send is retried on transient failures, like the other transactional emails.
 */
export const sendOrderCanceledEmailWorkflow = createWorkflow(
  "send-order-canceled-email",
  function (input: SendOrderCanceledEmailInput) {
    const result = sendOrderCanceledEmailStep(input);

    return new WorkflowResponse(result);
  },
);
