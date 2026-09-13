import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { StoreMergeWishlistType } from "../../../../../middlewares";
import { mergeGuestWishlistWorkflow } from "../../../../../../workflows/wishlist";
import { retrieveCustomerWishlist } from "../../../../wishlists/helpers";

/** Moves a guest wishlist's saves onto the customer's own list, then deletes it. */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreMergeWishlistType>,
  res: MedusaResponse,
) => {
  await mergeGuestWishlistWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      guest_wishlist_id: req.validatedBody.wishlist_id,
    },
  });

  const wishlist = await retrieveCustomerWishlist(
    req.scope,
    req.auth_context.actor_id,
  );

  res.json({ wishlist });
};
