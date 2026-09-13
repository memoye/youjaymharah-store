import type { MedusaContainer } from "@medusajs/framework/types";
import { WISHLIST_MODULE } from "../../../modules/wishlist";
import type WishlistModuleService from "../../../modules/wishlist/service";

export type StoreWishlist = {
  id: string | null;
  items: {
    id: string;
    product_id: string;
    product_variant_id: string | null;
    created_at: Date | string;
  }[];
};

async function listItems(
  service: WishlistModuleService,
  wishlistId: string,
): Promise<StoreWishlist["items"]> {
  return service.listWishlistItems(
    { wishlist_id: wishlistId },
    {
      select: ["id", "product_id", "product_variant_id", "created_at"],
      order: { created_at: "DESC" },
    },
  );
}

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

  return { id: wishlist.id, items: await listItems(service, wishlist.id) };
}

/**
 * A guest wishlist in the same shape, or null when the ID names no guest list
 * (never created, deleted, merged at sign-in, or a customer's list).
 */
export async function retrieveGuestWishlist(
  scope: MedusaContainer,
  wishlistId: string,
): Promise<StoreWishlist | null> {
  const service: WishlistModuleService = scope.resolve(WISHLIST_MODULE);

  const [wishlist] = await service.listWishlists({ id: wishlistId });

  if (!wishlist || wishlist.customer_id) {
    return null;
  }

  return { id: wishlist.id, items: await listItems(service, wishlist.id) };
}
