import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  getColourOption,
  getProductOptionValues,
  getSwatch,
} from "@lib/util/swatch"
import ColourSwatch from "@modules/common/components/colour-swatch"
import { getWishlist } from "@lib/data/wishlist"
import WishlistButton from "@modules/wishlist/components/wishlist-button"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

const MAX_CARD_SWATCHES = 5

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })

  const colourOption = getColourOption(product)
  const colours = colourOption
    ? getProductOptionValues(product, colourOption).filter((v) => getSwatch(v))
    : []

  // Memoised per request, so a grid of cards makes one wishlist call.
  const wishlist = await getWishlist()

  return (
    <div className="group relative">
      <LocalizedClientLink href={`/products/${product.handle}`}>
        <div data-testid="product-wrapper">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
          <div className="flex txt-compact-medium mt-4 justify-between">
            <Text className="text-ui-fg-subtle" data-testid="product-title">
              {product.title}
            </Text>
            <div className="flex items-center gap-x-2">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
          {colours.length > 1 && (
            <div
              className="mt-2 flex items-center gap-x-1.5"
              data-testid="product-colours"
            >
              {colours.slice(0, MAX_CARD_SWATCHES).map((colour) => (
                <ColourSwatch
                  key={colour.value}
                  swatch={getSwatch(colour)}
                  label={colour.value}
                  size="xs"
                />
              ))}
              {colours.length > MAX_CARD_SWATCHES && (
                <span className="txt-compact-xsmall text-ui-fg-subtle">
                  +{colours.length - MAX_CARD_SWATCHES}
                </span>
              )}
              <span className="sr-only">
                Available in {colours.map((c) => c.value).join(", ")}
              </span>
            </div>
          )}
        </div>
      </LocalizedClientLink>
      {/* Outside the link: a button nested in <a> is invalid and would
          also trigger navigation. */}
      <WishlistButton
        productId={product.id}
        productTitle={product.title}
        savedItemId={
          wishlist?.items.find((i) => i.product_id === product.id)?.id ?? null
        }
        isLoggedIn={!!wishlist}
        className="absolute right-3 top-3"
      />
    </div>
  )
}
