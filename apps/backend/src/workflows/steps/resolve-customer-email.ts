import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type ResolveCustomerEmailInput = { customer_id: string };

export type ResolveCustomerEmailOutput = { customer_id: string; email: string };

/** The email a password is being set for always comes from the account, never the request. */
export const resolveCustomerEmailStep = createStep(
  "resolve-customer-email",
  async (input: ResolveCustomerEmailInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: input.customer_id },
    });

    if (!customer?.email) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer ${input.customer_id} was not found, or has no email address.`,
      );
    }

    return new StepResponse<ResolveCustomerEmailOutput>({
      customer_id: customer.id,
      email: customer.email,
    });
  },
);
