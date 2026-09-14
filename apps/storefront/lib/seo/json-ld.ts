import type { HttpTypes } from "@medusajs/types"

import { isComingSoon } from "@/lib/medusa/product"
import type { StorefrontSettings } from "@/lib/medusa/storefront-settings"
import { getBaseURL } from "@/lib/util/env"

import { summarize } from "./metadata"
import { absoluteUrl, productPath } from "./routes"

/**
 * schema.org structured data, which search engines use for rich results
 * (price and stock in results, the store's logo and profiles). Render with
 * `<JsonLd data={...} />` from `components/seo/json-ld.tsx`, and check pages
 * with Google's Rich Results Test.
 */
type JsonLd = Record<string, unknown>

/** The store itself: name, logo, contact and social profiles. For the root layout. */
export function organizationJsonLd(settings: StorefrontSettings): JsonLd {
  const { brand, seo } = settings

  const sameAs = Object.values(seo.social_links ?? {}).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  )

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: getBaseURL(),
    ...(brand.logo_url ? { logo: brand.logo_url } : {}),
    ...(brand.support_email ? { email: brand.support_email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

/** The site as a whole. For the root layout, next to the organization. */
export function websiteJsonLd(settings: StorefrontSettings): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.brand.name,
    url: getBaseURL(),
  }
}

type ProductForJsonLd = Pick<
  HttpTypes.StoreProduct,
  "title" | "subtitle" | "description" | "handle" | "thumbnail" | "images"
> & {
  metadata?: Record<string, unknown> | null
  variants?:
    | Pick<
        HttpTypes.StoreProductVariant,
        | "sku"
        | "manage_inventory"
        | "allow_backorder"
        | "inventory_quantity"
        | "calculated_price"
      >[]
    | null
}

function canBuy(variant: NonNullable<ProductForJsonLd["variants"]>[number]) {
  return (
    variant.manage_inventory === false ||
    Boolean(variant.allow_backorder) ||
    (variant.inventory_quantity ?? 0) > 0
  )
}

/**
 * A product page's structured data, with its price range and stock. Fetch the
 * product with `*variants.calculated_price`, `+variants.inventory_quantity`
 * and `+metadata`, for the region whose `currency_code` is passed.
 */
export function productJsonLd(
  product: ProductForJsonLd,
  currencyCode: string,
  settings: StorefrontSettings,
): JsonLd {
  const variants = product.variants ?? []
  const prices = variants
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")

  // A coming-soon product cannot be bought yet, so it is reported as
  // unavailable rather than as a pre-order.
  const inStock = !isComingSoon(product) && variants.some(canBuy)
  const availability = inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock"

  const url = absoluteUrl(productPath(product.handle))
  const currency = currencyCode.toUpperCase()

  const offers = prices.length
    ? Math.min(...prices) === Math.max(...prices)
      ? {
          "@type": "Offer",
          price: prices[0],
          priceCurrency: currency,
          availability,
          url,
        }
      : {
          "@type": "AggregateOffer",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: prices.length,
          priceCurrency: currency,
          availability,
          url,
        }
    : undefined

  const images = [
    product.thumbnail,
    ...(product.images ?? []).map((image) => image.url),
  ].filter(
    (image, index, all): image is string =>
      Boolean(image) && all.indexOf(image) === index,
  )

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: summarize(product.description, 5000),
    url,
    ...(images.length ? { image: images } : {}),
    ...(variants.length === 1 && variants[0].sku
      ? { sku: variants[0].sku }
      : {}),
    brand: { "@type": "Brand", name: settings.brand.name },
    ...(offers ? { offers } : {}),
  }
}

/** A trail such as Home › Women › Dresses › Pleated Midi Dress. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
