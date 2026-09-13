import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  sendVerificationEmailStep,
  type SendVerificationEmailInput,
} from "./steps/send-verification-email";

/**
 * Runs on auth.verification_requested through the subscriber, i.e. when the
 * storefront calls POST /auth/verification/request. Only the token's hash is
 * stored, so this send is the one chance to deliver it -- hence the retries.
 */
export const sendVerificationEmailWorkflow = createWorkflow(
  "send-verification-email",
  function (input: SendVerificationEmailInput) {
    const result = sendVerificationEmailStep(input);

    return new WorkflowResponse(result);
  },
);
