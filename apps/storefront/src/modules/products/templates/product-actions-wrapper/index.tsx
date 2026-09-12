import { listProducts } from "@lib/data/products"
import { getWishlist } from "@lib/data/wishlist"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing and the customer's wishlist for a product and
 * renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const [product, wishlist] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    getWishlist(),
  ])

  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      isLoggedIn={!!wishlist}
      savedItemId={
        wishlist?.items.find((i) => i.product_id === product.id)?.id ?? null
      }
    />
  )
}
