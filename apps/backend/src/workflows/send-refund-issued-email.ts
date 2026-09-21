import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { sendPreparedEmailStep } from "./steps/send-prepared-email";

import {
  prepareRefundIssuedEmailStep,
  type SendRefundIssuedEmailInput,
} from "./steps/prepare-refund-issued-email";

/**
 * Runs on payment.refund.created through the subscriber, i.e. when a refund is
 * recorded against a payment in the admin. Refunds made outside Medusa (the
 * Credo dashboard) raise no event and so send nothing.
 */
export const sendRefundIssuedEmailWorkflow = createWorkflow(
  "send-refund-issued-email",
  function (input: SendRefundIssuedEmailInput) {
    const prepared = prepareRefundIssuedEmailStep(input);
    sendPreparedEmailStep(prepared.notification);
    return new WorkflowResponse(prepared.result);
  },
);
