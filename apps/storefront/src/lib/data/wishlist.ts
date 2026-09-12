"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { updateTag } from "next/cache"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"

export type WishlistItem = {
  id: string
  product_id: string
  product_variant_id: string | null
  created_at: string
}

export type Wishlist = {
  id: string | null
  items: WishlistItem[]
}

/**
 * The logged-in customer's wishlist, or null for guests. Backed by
 * /store/customers/me/wishlist (custom backend route), which returns IDs
 * only -- product details are loaded through listProducts so region pricing
 * and publish status apply.
 */
export async function getWishlist(): Promise<Wishlist | null> {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return null
  }

  // Cache only when the response is tagged; an untagged cached wishlist could
  // never be invalidated after the customer changes it.
  const next = await getCacheOptions("wishlist")

  return (
    sdk.client
      .fetch<{ wishlist: Wishlist }>(`/store/customers/me/wishlist`, {
        method: "GET",
        headers,
        next,
        cache: "tags" in next ? "force-cache" : "no-store",
      })
      .then(({ wishlist }) => wishlist)
      // An expired session reads as "not logged in", not as an error page.
      .catch(() => null)
  )
}

// updateTag, not revalidateTag: the heart must show the new state on the very
// next render (read-your-own-writes), not a stale cached list.
const revalidateWishlist = async () => {
  const tag = await getCacheTag("wishlist")
  if (tag) {
    updateTag(tag)
  }
}

export async function addToWishlist(input: {
  productId: string
  variantId?: string | null
}): Promise<Wishlist> {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ wishlist: Wishlist }>(`/store/customers/me/wishlist/items`, {
      method: "POST",
      body: {
        product_id: input.productId,
        variant_id: input.variantId ?? null,
      },
      headers,
    })
    .then(async ({ wishlist }) => {
      await revalidateWishlist()
      return wishlist
    })
    .catch(medusaError)
}

export async function removeFromWishlist(itemId: string): Promise<Wishlist> {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ wishlist: Wishlist }>(
      `/store/customers/me/wishlist/items/${itemId}`,
      {
        method: "DELETE",
        headers,
      }
    )
    .then(async ({ wishlist }) => {
      await revalidateWishlist()
      return wishlist
    })
    .catch(medusaError)
}
