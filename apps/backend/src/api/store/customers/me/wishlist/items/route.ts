import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { StoreAddWishlistItemType } from "../../../../../middlewares";
import { addToWishlistWorkflow } from "../../../../../../workflows/wishlist";
import { retrieveCustomerWishlist } from "../helpers";

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreAddWishlistItemType>,
  res: MedusaResponse,
) => {
  await addToWishlistWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      product_id: req.validatedBody.product_id,
      product_variant_id: req.validatedBody.variant_id ?? null,
    },
  });

  const wishlist = await retrieveCustomerWishlist(
    req.scope,
    req.auth_context.actor_id,
  );

  res.json({ wishlist });
};
