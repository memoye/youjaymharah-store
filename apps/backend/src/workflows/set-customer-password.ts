import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { setAuthAppMetadataStep } from "@medusajs/medusa/core-flows";

import { createEmailpassIdentityStep } from "./steps/create-emailpass-identity";
import { resolveCustomerEmailStep } from "./steps/resolve-customer-email";

export type SetCustomerPasswordInput = {
  customer_id: string;
  password: string;
};

/**
 * Adds an email/password login to an account that signed up with Google.
 *
 * Medusa's own update-password route can only change a password that already
 * exists, so a Google-only customer has nothing to reset. The customer is
 * already signed in when they call this, and Google verified the address, so
 * no emailed link is needed -- the new identity is attached straight to their
 * customer, giving them two ways into the same account.
 */
export const setCustomerPasswordWorkflow = createWorkflow(
  "set-customer-password",
  function (input: SetCustomerPasswordInput) {
    const customer = resolveCustomerEmailStep({
      customer_id: input.customer_id,
    });

    const identity = createEmailpassIdentityStep({
      email: customer.email,
      password: input.password,
    });

    setAuthAppMetadataStep({
      authIdentityId: identity.auth_identity_id,
      actorType: "customer",
      value: input.customer_id,
    });

    return new WorkflowResponse({ success: true });
  },
);
