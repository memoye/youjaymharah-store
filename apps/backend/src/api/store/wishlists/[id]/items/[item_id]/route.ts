import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { removeFromGuestWishlistWorkflow } from "../../../../../../workflows/wishlist";
import { retrieveGuestWishlist } from "../../../helpers";

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  await removeFromGuestWishlistWorkflow(req.scope).run({
    input: {
      wishlist_id: req.params.id,
      item_id: req.params.item_id,
    },
  });

  const wishlist = await retrieveGuestWishlist(req.scope, req.params.id);

  res.json({ wishlist });
};
