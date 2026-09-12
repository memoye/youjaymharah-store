import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { StoreSetCustomerPasswordType } from "../../../../middlewares";
import { setCustomerPasswordWorkflow } from "../../../../../workflows/set-customer-password";

/**
 * Sets a password on an account that has none -- the Google-only case.
 *
 * /store/customers/me/* already requires a logged-in customer, and the email
 * is read from their account rather than the request, so this cannot be used
 * to attach a password to someone else's address. Changing an existing
 * password stays with Medusa's reset flow.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreSetCustomerPasswordType>,
  res: MedusaResponse,
) => {
  await setCustomerPasswordWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      password: req.validatedBody.password,
    },
  });

  res.json({ success: true });
};
