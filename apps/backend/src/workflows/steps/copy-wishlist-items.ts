import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type CopyWishlistItemsInput = {
  from_wishlist_id: string;
  to_wishlist_id: string;
};

type Compensation = {
  created: string[];
  updated: { id: string; previous_variant_id: string | null }[];
};

/**
 * Copies a guest's saves onto the customer's list, keeping one entry per
 * product. Where both lists hold a product, the customer's entry stays, and
 * only takes the guest's colour/size when it had none -- a choice the customer
 * made while signed in is never overwritten by an anonymous one.
 */
export const copyWishlistItemsStep = createStep(
  "copy-wishlist-items",
  async (input: CopyWishlistItemsInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [incoming, existing] = await Promise.all([
      service.listWishlistItems({ wishlist_id: input.from_wishlist_id }),
      service.listWishlistItems({ wishlist_id: input.to_wishlist_id }),
    ]);

    const existingByProduct = new Map(
      existing.map((item) => [item.product_id, item]),
    );

    const toCreate: {
      wishlist_id: string;
      product_id: string;
      product_variant_id: string | null;
    }[] = [];
    const toUpdate: { id: string; product_variant_id: string }[] = [];
    const compensation: Compensation = { created: [], updated: [] };

    for (const item of incoming) {
      const match = existingByProduct.get(item.product_id);

      if (!match) {
        toCreate.push({
          wishlist_id: input.to_wishlist_id,
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
        });
        continue;
      }

      if (!match.product_variant_id && item.product_variant_id) {
        toUpdate.push({
          id: match.id,
          product_variant_id: item.product_variant_id,
        });
        compensation.updated.push({ id: match.id, previous_variant_id: null });
      }
    }

    if (toCreate.length) {
      const created = await service.createWishlistItems(toCreate);
      compensation.created = created.map((item) => item.id);
    }

    if (toUpdate.length) {
      await service.updateWishlistItems(toUpdate);
    }

    return new StepResponse(
      { copied: toCreate.length, updated: toUpdate.length },
      compensation,
    );
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    if (compensation.created.length) {
      await service.deleteWishlistItems(compensation.created);
    }

    if (compensation.updated.length) {
      await service.updateWishlistItems(
        compensation.updated.map(({ id, previous_variant_id }) => ({
          id,
          product_variant_id: previous_variant_id,
        })),
      );
    }
  },
);
