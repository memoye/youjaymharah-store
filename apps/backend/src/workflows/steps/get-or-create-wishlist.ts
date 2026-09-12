import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type GetOrCreateWishlistInput = { customer_id: string };

/** Returns the customer's wishlist, creating it on their first save. */
export const getOrCreateWishlistStep = createStep(
  "get-or-create-wishlist",
  async (input: GetOrCreateWishlistInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [existing] = await service.listWishlists({
      customer_id: input.customer_id,
    });

    if (existing) {
      // Nothing created, so nothing to undo.
      return new StepResponse({ id: existing.id }, null);
    }

    const created = await service.createWishlists({
      customer_id: input.customer_id,
    });

    return new StepResponse({ id: created.id }, created.id);
  },
  async (createdId, { container }) => {
    if (!createdId) {
      return;
    }
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);
    await service.deleteWishlists(createdId);
  },
);
