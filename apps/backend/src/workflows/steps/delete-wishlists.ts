import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type DeleteWishlistsInput = { ids: string[] };

/**
 * Soft-deletes wishlists and their items, so a later step's failure can bring
 * them back.
 */
export const softDeleteWishlistsStep = createStep(
  "soft-delete-wishlists",
  async (input: DeleteWishlistsInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    if (input.ids.length) {
      await service.softDeleteWishlists(input.ids);
    }

    return new StepResponse({ ids: input.ids }, input.ids);
  },
  async (ids, { container }) => {
    if (!ids?.length) {
      return;
    }

    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    await service.restoreWishlists(ids);
  },
);

/**
 * Removes wishlists and their items for good. Only for data nobody can reach
 * any more (abandoned guest lists), since it cannot be undone.
 */
export const hardDeleteWishlistsStep = createStep(
  "hard-delete-wishlists",
  async (input: DeleteWishlistsInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    if (input.ids.length) {
      await service.deleteWishlists(input.ids);
    }

    return new StepResponse({ deleted: input.ids.length });
  },
);
