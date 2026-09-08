import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendOrderConfirmationStep,
  type SendOrderConfirmationInput,
} from "./steps/send-order-confirmation";

/**
 * Runs on order.placed through the subscriber. Keeping the send in a workflow
 * (rather than inline in the subscriber) is what makes retries work: the
 * workflow engine tracks the step and re-runs it on schedule, and with the
 * Redis workflow engine the retry survives process restarts and deploys.
 */
export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  function (input: SendOrderConfirmationInput) {
    const result = sendOrderConfirmationStep(input);

    return new WorkflowResponse(result);
  },
);
