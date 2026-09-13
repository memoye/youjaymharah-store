import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendRefundIssuedEmailStep,
  type SendRefundIssuedEmailInput,
} from "./steps/send-refund-issued-email";

/**
 * Runs on payment.refunded through the subscriber, i.e. when a refund is
 * recorded against a payment in the admin. Refunds made outside Medusa (the
 * Credo dashboard) raise no event and so send nothing.
 */
export const sendRefundIssuedEmailWorkflow = createWorkflow(
  "send-refund-issued-email",
  function (input: SendRefundIssuedEmailInput) {
    const result = sendRefundIssuedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
