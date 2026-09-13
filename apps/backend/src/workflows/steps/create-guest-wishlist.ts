import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

/** Starts a wishlist that belongs to no customer yet. */
export const createGuestWishlistStep = createStep(
  "create-guest-wishlist",
  async (_input: void, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const created = await service.createWishlists({ customer_id: null });

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
