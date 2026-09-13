import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type RemoveWishlistItemInput = {
  /** The list the caller owns; null when they have none yet. */
  wishlist_id: string | null;
  item_id: string;
};

/**
 * Removes an item from the caller's own wishlist. An item on any other list is
 * reported as not found, so item IDs can't be probed.
 */
export const removeWishlistItemStep = createStep(
  "remove-wishlist-item",
  async (input: RemoveWishlistItemInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [item] = await service.listWishlistItems(
      { id: input.item_id },
      { relations: ["wishlist"] },
    );

    if (
      !item ||
      !input.wishlist_id ||
      item.wishlist?.id !== input.wishlist_id
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Wishlist item ${input.item_id} was not found.`,
      );
    }

    await service.softDeleteWishlistItems(item.id);

    return new StepResponse({ id: item.id }, item.id);
  },
  async (itemId, { container }) => {
    if (!itemId) {
      return;
    }

    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    await service.restoreWishlistItems(itemId);
  },
);
