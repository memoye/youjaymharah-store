import { queryOptions } from "@tanstack/react-query"
import type { StoreWishlistResponse, Wishlist } from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { CURRENT_WISHLIST_ID } from "@/lib/medusa/constants"
import { queryKeys } from "@/lib/query/keys"

export const wishlistQueries = {
  /**
   * This shopper's saved products as ids: the customer's list when signed in,
   * otherwise the guest list. Never rejects for "nothing saved yet"; that is an
   * empty list. Load the products themselves with the regular product queries.
   */
  current: () =>
    queryOptions({
      queryKey: queryKeys.wishlist.current(),
      queryFn: async (): Promise<Wishlist> =>
        (
          await getBrowserSdk().client.fetch<StoreWishlistResponse>(
            `/store/wishlists/${CURRENT_WISHLIST_ID}`,
          )
        ).wishlist,
      meta: { private: true },
    }),
}
