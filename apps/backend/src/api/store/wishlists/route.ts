import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { StoreAddWishlistItemType } from "../../middlewares";
import { createGuestWishlistWorkflow } from "../../../workflows/wishlist";
import { retrieveGuestWishlist } from "./helpers";

/**
 * Starts a guest wishlist with its first item. Anyone holding the returned ID
 * can change the list, as with a guest cart, so the storefront keeps it in an
 * httpOnly cookie. Signed-in customers use /store/customers/me/wishlist.
 */
export const POST = async (
  req: MedusaRequest<StoreAddWishlistItemType>,
  res: MedusaResponse,
) => {
  const { result } = await createGuestWishlistWorkflow(req.scope).run({
    input: {
      product_id: req.validatedBody.product_id,
      product_variant_id: req.validatedBody.variant_id ?? null,
    },
  });

  const wishlist = await retrieveGuestWishlist(req.scope, result.wishlist_id);

  res.json({ wishlist });
};
