import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { retrieveCustomerWishlist } from "./helpers";

// /store/customers/me/* requires a logged-in customer by default.
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const wishlist = await retrieveCustomerWishlist(
    req.scope,
    req.auth_context.actor_id,
  );

  res.json({ wishlist });
};
