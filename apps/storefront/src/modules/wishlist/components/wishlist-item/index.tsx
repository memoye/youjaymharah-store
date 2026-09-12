import { getProductPrice } from "@lib/util/get-product-price"
import { COLOUR_QUERY_KEY, getColourOption } from "@lib/util/swatch"
import { WishlistItem as WishlistItemType } from "@lib/data/wishlist"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PreviewPrice from "@modules/products/components/product-preview/price"
import Thumbnail from "@modules/products/components/thumbnail"
import WishlistButton from "../wishlist-button"

type WishlistItemProps = {
  item: WishlistItemType
  product: HttpTypes.StoreProduct
}

/**
 * A saved product. When a colour/size was saved, the card shows that
 * variant's photo, options and price, and links straight back to it.
 */
const WishlistItem = ({ item, product }: WishlistItemProps) => {
  const variant = item.product_variant_id
    ? product.variants?.find((v) => v.id === item.product_variant_id)
    : undefined

  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })
  const price = variantPrice ?? cheapestPrice

  const colourOption = getColourOption(product)
  const colour = colourOption
    ? variant?.options?.find((o) => o.option_id === colourOption.id)?.value
    : undefined

  const params = new URLSearchParams()
  if (variant) {
    params.set("v_id", variant.id)
  }
  if (colour) {
    params.set(COLOUR_QUERY_KEY, colour)
  }
  const href = `/products/${product.handle}${
    params.size ? `?${params.toString()}` : ""
  }`

  const soldOut =
    !!variant &&
    !!variant.manage_inventory &&
    !variant.allow_backorder &&
    (variant.inventory_quantity ?? 0) <= 0

  return (
    <div className="group relative" data-testid="wishlist-item">
      <LocalizedClientLink href={href}>
        <Thumbnail
          thumbnail={variant?.thumbnail ?? product.thumbnail}
          images={variant?.thumbnail ? [] : product.images}
          size="full"
        />
        <div className="mt-4 flex justify-between txt-compact-medium">
          <div className="flex flex-col">
            <Text className="text-ui-fg-base">{product.title}</Text>
            {variant && (
              <Text className="text-ui-fg-subtle">
                {variant.options?.map((o) => o.value).join(" / ")}
              </Text>
            )}
            {soldOut && (
              <Text className="text-ui-fg-subtle">Sold out in this size</Text>
            )}
          </div>
          <div className="flex items-start gap-x-2">
            {price && <PreviewPrice price={price} />}
          </div>
        </div>
      </LocalizedClientLink>
      <WishlistButton
        productId={product.id}
        productTitle={product.title}
        savedItemId={item.id}
        isLoggedIn
        className="absolute right-3 top-3"
      />
    </div>
  )
}

export default WishlistItem
