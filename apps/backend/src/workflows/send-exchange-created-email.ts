import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendExchangeCreatedEmailStep,
  type SendExchangeCreatedEmailInput,
} from "./steps/send-exchange-created-email";

/**
 * Runs on order.exchange_created through the subscriber, i.e. when staff
 * confirm an exchange in the admin. Kept in a workflow so the send is retried
 * on transient failures, like the other transactional emails.
 */
export const sendExchangeCreatedEmailWorkflow = createWorkflow(
  "send-exchange-created-email",
  function (input: SendExchangeCreatedEmailInput) {
    const result = sendExchangeCreatedEmailStep(input);

    return new WorkflowResponse(result);
  },
);
