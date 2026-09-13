import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { WISHLIST_MODULE } from "../../modules/wishlist";
import type WishlistModuleService from "../../modules/wishlist/service";

export type ResolveGuestWishlistInput = { wishlist_id: string };

/**
 * Checks that an ID names a guest wishlist. A customer's wishlist reads as not
 * found, so an ID that leaked from an account can't be used to read or change
 * that customer's list without signing in.
 */
export const resolveGuestWishlistStep = createStep(
  "resolve-guest-wishlist",
  async (input: ResolveGuestWishlistInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

    const [wishlist] = await service.listWishlists({ id: input.wishlist_id });

    if (!wishlist || wishlist.customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Wishlist ${input.wishlist_id} was not found.`,
      );
    }

    return new StepResponse({ id: wishlist.id });
  },
);
