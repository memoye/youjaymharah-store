import type { MedusaContainer } from "@medusajs/framework/types";

import { WISHLIST_MODULE } from "../../../../../modules/wishlist";
import type WishlistModuleService from "../../../../../modules/wishlist/service";

export type StoreWishlist = {
  id: string | null;
  items: {
    id: string;
    product_id: string;
    product_variant_id: string | null;
    created_at: Date | string;
  }[];
};

/**
 * The customer's wishlist as IDs, newest first. Product details and prices
 * are deliberately not embedded: the storefront loads them through the
 * regular product endpoints, which apply the shopper's region pricing and
 * hide unpublished products.
 */
export async function retrieveCustomerWishlist(
  scope: MedusaContainer,
  customerId: string,
): Promise<StoreWishlist> {
  const service: WishlistModuleService = scope.resolve(WISHLIST_MODULE);

  const [wishlist] = await service.listWishlists({ customer_id: customerId });
  if (!wishlist) {
    return { id: null, items: [] };
  }

  const items = await service.listWishlistItems(
    { wishlist_id: wishlist.id },
    {
      select: ["id", "product_id", "product_variant_id", "created_at"],
      order: { created_at: "DESC" },
    },
  );

  return { id: wishlist.id, items };
}
