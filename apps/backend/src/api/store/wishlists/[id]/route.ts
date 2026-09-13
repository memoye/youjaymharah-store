import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { retrieveGuestWishlist } from "../helpers";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wishlist = await retrieveGuestWishlist(req.scope, req.params.id);

  if (!wishlist) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Wishlist ${req.params.id} was not found.`,
    );
  }

  res.json({ wishlist });
};
