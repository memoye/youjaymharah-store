import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { StoreAddWishlistItemType } from "../../../../middlewares";
import { addToGuestWishlistWorkflow } from "../../../../../workflows/wishlist";
import { retrieveGuestWishlist } from "../../helpers";

export const POST = async (
  req: MedusaRequest<StoreAddWishlistItemType>,
  res: MedusaResponse,
) => {
  await addToGuestWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id,
      product_id: req.validatedBody.product_id,
      product_variant_id: req.validatedBody.variant_id ?? null,
    },
  });

  const wishlist = await retrieveGuestWishlist(req.scope, req.params.id);

  res.json({ wishlist });
};
