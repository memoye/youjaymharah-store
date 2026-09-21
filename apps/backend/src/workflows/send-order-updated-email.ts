import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { sendPreparedEmailStep } from "./steps/send-prepared-email";

import {
  prepareOrderUpdatedEmailStep,
  type SendOrderUpdatedEmailInput,
} from "./steps/prepare-order-updated-email";

/**
 * Runs on order-edit.confirmed through the subscriber, i.e. when staff confirm
 * an order edit in the admin. Only the confirmation sends: the admin requests
 * and confirms an edit in one action, so emailing on the request as well
 * would reach the customer twice.
 */
export const sendOrderUpdatedEmailWorkflow = createWorkflow(
  "send-order-updated-email",
  function (input: SendOrderUpdatedEmailInput) {
    const prepared = prepareOrderUpdatedEmailStep(input);
    sendPreparedEmailStep(prepared.notification);
    return new WorkflowResponse(prepared.result);
  },
);
