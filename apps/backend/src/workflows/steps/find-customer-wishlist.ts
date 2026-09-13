import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type FindCustomerWishlistInput = { customer_id: string };

/**
 * The customer's wishlist ID, or null before their first save. Unlike
 * getOrCreateWishlistStep, never creates one: removing from a list that does
 * not exist should fail, not leave an empty list behind.
 */
export const findCustomerWishlistStep = createStep(
  "find-customer-wishlist",
  async (input: FindCustomerWishlistInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [wishlist] = await service.listWishlists({
      customer_id: input.customer_id,
    });

    return new StepResponse({ id: wishlist?.id ?? null });
  },
);
