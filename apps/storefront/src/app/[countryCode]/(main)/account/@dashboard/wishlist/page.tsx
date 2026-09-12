import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getWishlist } from "@lib/data/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistItem from "@modules/wishlist/components/wishlist-item"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Pieces you've saved for later.",
}

export default async function Wishlist(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [wishlist, region] = await Promise.all([
    getWishlist(),
    getRegion(countryCode),
  ])

  if (!wishlist || !region) {
    notFound()
  }

  const productIds = Array.from(
    new Set(wishlist.items.map((i) => i.product_id))
  )

  // Loaded through the store product endpoint so prices use this region and
  // products that were unpublished or deleted since saving drop out.
  const products = productIds.length
    ? await listProducts({
        countryCode,
        queryParams: { id: productIds, limit: productIds.length },
      }).then(({ response }) => response.products)
    : []

  const byId = new Map(products.map((p) => [p.id, p]))
  const saved = wishlist.items.filter((item) => byId.has(item.product_id))

  return (
    <div className="w-full" data-testid="wishlist-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Wishlist</h1>
        <p className="text-base-regular">
          Pieces you&apos;ve saved. Tap the heart to remove one.
        </p>
      </div>

      {saved.length ? (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 medium:grid-cols-3">
          {saved.map((item) => (
            <li key={item.id}>
              <WishlistItem item={item} product={byId.get(item.product_id)!} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="flex flex-col items-start gap-y-4"
          data-testid="wishlist-empty"
        >
          <p className="text-base-regular text-ui-fg-subtle">
            Nothing saved yet. Tap the heart on any product to keep it here.
          </p>
          <LocalizedClientLink
            href="/store"
            className="text-base-regular underline underline-offset-4"
          >
            Browse the collection
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}
