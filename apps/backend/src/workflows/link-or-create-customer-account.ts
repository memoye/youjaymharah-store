import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createCustomerAccountWorkflow,
  setAuthAppMetadataStep,
} from "@medusajs/medusa/core-flows";

import { resolveSocialCustomerStep } from "./steps/resolve-social-customer";

export type LinkOrCreateCustomerAccountInput = {
  auth_identity_id: string;
  first_name?: string | null;
  last_name?: string | null;
};

/**
 * Finishes a social sign-in (currently Google).
 *
 * Medusa's own register route refuses when the email already has an account,
 * which would leave a Google sign-in dead-ended for every existing customer.
 * Here the auth identity is attached to that account instead, so one person
 * keeps one customer record -- and their order history -- whether they arrive
 * by password or by Google.
 *
 * Linking is only safe because the provider verified the email; see
 * TRUSTED_PROVIDERS in resolve-social-customer.ts.
 */
export const linkOrCreateCustomerAccountWorkflow = createWorkflow(
  "link-or-create-customer-account",
  function (input: LinkOrCreateCustomerAccountInput) {
    const resolved = resolveSocialCustomerStep({
      auth_identity_id: input.auth_identity_id,
    });

    const linkedCustomerId = when(
      "link-to-existing-account",
      { resolved },
      (data) => !!data.resolved.existing_customer_id,
    ).then(() => {
      const customerId = transform(
        { resolved },
        (data) => data.resolved.existing_customer_id as string,
      );

      setAuthAppMetadataStep({
        authIdentityId: input.auth_identity_id,
        actorType: "customer",
        value: customerId,
      });

      return customerId;
    });

    const createdCustomer = when(
      "create-new-account",
      { resolved },
      (data) => !data.resolved.existing_customer_id,
    ).then(() => {
      const accountInput = transform({ resolved, input }, (data) => ({
        authIdentityId: data.input.auth_identity_id,
        customerData: {
          email: data.resolved.email,
          first_name: data.input.first_name ?? undefined,
          last_name: data.input.last_name ?? undefined,
        },
      }));

      return createCustomerAccountWorkflow.runAsStep({ input: accountInput });
    });

    const result = transform({ linkedCustomerId, createdCustomer }, (data) => ({
      customer_id: (data.linkedCustomerId ??
        data.createdCustomer?.id) as string,
      linked: !!data.linkedCustomerId,
    }));

    return new WorkflowResponse(result);
  },
);
