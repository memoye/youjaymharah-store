import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { getOrCreateWishlistStep } from "./steps/get-or-create-wishlist";
import { removeWishlistItemStep } from "./steps/remove-wishlist-item";
import { saveWishlistItemStep } from "./steps/save-wishlist-item";
import { validateWishlistProductStep } from "./steps/validate-wishlist-product";

export type AddToWishlistInput = {
  customer_id: string;
  product_id: string;
  product_variant_id?: string | null;
};

export const addToWishlistWorkflow = createWorkflow(
  "add-to-wishlist",
  function (input: AddToWishlistInput) {
    validateWishlistProductStep(input);

    const wishlist = getOrCreateWishlistStep({
      customer_id: input.customer_id,
    });

    const itemInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      product_id: data.input.product_id,
      product_variant_id: data.input.product_variant_id,
    }));

    const item = saveWishlistItemStep(itemInput);

    return new WorkflowResponse({ wishlist_id: wishlist.id, item });
  },
);

export type RemoveFromWishlistInput = {
  customer_id: string;
  item_id: string;
};

export const removeFromWishlistWorkflow = createWorkflow(
  "remove-from-wishlist",
  function (input: RemoveFromWishlistInput) {
    const removed = removeWishlistItemStep(input);

    return new WorkflowResponse(removed);
  },
);
