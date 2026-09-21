import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { sendPreparedEmailStep } from "./steps/send-prepared-email";

import {
  prepareVerificationEmailStep,
  type SendVerificationEmailInput,
} from "./steps/prepare-verification-email";

/**
 * Runs on auth.verification_requested through the subscriber, i.e. when the
 * storefront calls POST /auth/verification/request. Only the token's hash is
 * stored, so this send is the one chance to deliver it -- hence the retries.
 */
export const sendVerificationEmailWorkflow = createWorkflow(
  "send-verification-email",
  function (input: SendVerificationEmailInput) {
    const prepared = prepareVerificationEmailStep(input);
    sendPreparedEmailStep(prepared.notification);
    return new WorkflowResponse(prepared.result);
  },
);
