import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { removeFromWishlistWorkflow } from "../../../../../../../workflows/wishlist";
import { retrieveCustomerWishlist } from "../../helpers";

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  await removeFromWishlistWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      item_id: req.params.id,
    },
  });

  const wishlist = await retrieveCustomerWishlist(
    req.scope,
    req.auth_context.actor_id,
  );

  res.json({ wishlist });
};
