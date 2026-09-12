import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type SaveWishlistItemInput = {
  wishlist_id: string;
  product_id: string;
  product_variant_id?: string | null;
};

type Compensation =
  | { created: string }
  | { updated: string; previous_variant_id: string | null }
  | null;

/**
 * One entry per product. Saving a product that is already on the list is a
 * no-op, except that a specific variant (colour/size picked on the product
 * page) replaces whatever was saved before, so the list reflects the
 * customer's latest choice. Safe to call repeatedly.
 */
export const saveWishlistItemStep = createStep(
  "save-wishlist-item",
  async (input: SaveWishlistItemInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [existing] = await service.listWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id,
    });

    if (existing) {
      const variantId = input.product_variant_id ?? null;
      if (!variantId || existing.product_variant_id === variantId) {
        return new StepResponse({ id: existing.id }, null as Compensation);
      }

      await service.updateWishlistItems({
        id: existing.id,
        product_variant_id: variantId,
      });
      return new StepResponse({ id: existing.id }, {
        updated: existing.id,
        previous_variant_id: existing.product_variant_id,
      } as Compensation);
    }

    const created = await service.createWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id,
      product_variant_id: input.product_variant_id ?? null,
    });

    return new StepResponse({ id: created.id }, {
      created: created.id,
    } as Compensation);
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    if ("created" in compensation) {
      await service.deleteWishlistItems(compensation.created);
      return;
    }

    await service.updateWishlistItems({
      id: compensation.updated,
      product_variant_id: compensation.previous_variant_id,
    });
  },
);
