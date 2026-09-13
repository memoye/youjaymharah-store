import "server-only";

import type { StoreWishlistResponse, Wishlist } from "@youjaymharah/api-types";

import { EMPTY_WISHLIST } from "@/lib/medusa/constants";
import { isNotFound, isUnauthorized } from "@/lib/medusa/errors";
import { getAuthHeaders, sdk } from "@/lib/medusa/server";
import { getWishlistId } from "@/lib/medusa/session";

/**
 * The server-side query function for `wishlistQueries.current()`, so hearts
 * render filled on the first paint. Prefetch it the same way as the cart (see
 * features/cart/server.ts).
 *
 * It reads cookies, which makes the page render per request: prefetch it on
 * account pages, not on cached catalogue pages.
 */
export async function fetchWishlistOnServer(): Promise<Wishlist> {
  const headers = await getAuthHeaders();
  let path = "/store/customers/me/wishlist";

  if (!headers.authorization) {
    const wishlistId = await getWishlistId();

    if (!wishlistId) {
      return EMPTY_WISHLIST;
    }

    path = `/store/wishlists/${encodeURIComponent(wishlistId)}`;
  }

  try {
    const { wishlist } = await sdk.client.fetch<StoreWishlistResponse>(path, {
      headers,
    });

    return wishlist;
  } catch (error) {
    // A guest list that is gone, or a session that has ended. A stale cookie
    // stays until the proxy clears it on the next browser request.
    if (isNotFound(error) || isUnauthorized(error)) {
      return EMPTY_WISHLIST;
    }

    throw error;
  }
}
