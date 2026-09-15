import type { HttpTypes } from "@medusajs/types"

/** Nigerian English: "₦45,000". */
export const DEFAULT_LOCALE = "en-NG"

const formatters = new Map<string, Intl.NumberFormat>()

/**
 * A price for display, such as "₦45,000" or "₦1,250.50". Amounts come from
 * Medusa as-is (₦45,000 is `45000`), so this never divides by 100. Whole
 * amounts drop the ".00".
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  const currency = currencyCode.toUpperCase()
  const key = `${locale}|${currency}|${fractionDigits}`

  let formatter = formatters.get(key)

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    })
    formatters.set(key, formatter)
  }

  return formatter.format(amount)
}

export type Price = {
  /** What the shopper pays. */
  amount: number
  /** The price before the sale; equal to `amount` when not on sale. */
  originalAmount: number
  currencyCode: string
  /** A sale price list applies: strike through `originalAmount`. */
  isOnSale: boolean
  /** Whole percent off, at least 1 when on sale; 0 otherwise. */
  percentOff: number
}

type PricedVariant = Pick<
  HttpTypes.StoreProductVariant,
  "id" | "calculated_price"
>

/**
 * A variant's price, or null when it has none. No price usually means the
 * product was fetched without `region_id` or without
 * `*variants.calculated_price` in `fields`.
 *
 * Only a "sale" price list counts as a sale. An "override" price list (such as
 * wholesale pricing for a customer group) replaces the price without a
 * strike-through.
 */
export function getVariantPrice(variant: PricedVariant): Price | null {
  const price = variant.calculated_price

  if (!price || typeof price.calculated_amount !== "number") {
    return null
  }

  const amount = price.calculated_amount
  const original =
    typeof price.original_amount === "number" ? price.original_amount : amount
  const isOnSale =
    price.calculated_price?.price_list_type === "sale" && original > amount

  return {
    amount,
    originalAmount: isOnSale ? original : amount,
    currencyCode: price.currency_code ?? "",
    isOnSale,
    percentOff: isOnSale
      ? Math.max(1, Math.round(((original - amount) / original) * 100))
      : 0,
  }
}

export type ProductPrice = {
  /** The chosen variant's price, or the cheapest when none is chosen. */
  price: Price
  /** Variants cost different amounts and none is chosen: show "From". */
  isRange: boolean
}

/**
 * The price to show for a product: the chosen variant's when `variantId` is
 * given and priced, otherwise the cheapest variant's, flagged as a range when
 * variants differ. Null when no variant is priced.
 */
export function getProductPrice(
  product: { variants?: PricedVariant[] | null },
  variantId?: string | null,
): ProductPrice | null {
  const priced = (product.variants ?? [])
    .map((variant) => ({ id: variant.id, price: getVariantPrice(variant) }))
    .filter((entry): entry is { id: string; price: Price } =>
      Boolean(entry.price),
    )

  if (!priced.length) {
    return null
  }

  const chosen = variantId
    ? priced.find((entry) => entry.id === variantId)
    : undefined

  if (chosen) {
    return { price: chosen.price, isRange: false }
  }

  const cheapest = priced.reduce((lowest, entry) =>
    entry.price.amount < lowest.price.amount ? entry : lowest,
  )
  const isRange = priced.some(
    (entry) => entry.price.amount !== cheapest.price.amount,
  )

  return { price: cheapest.price, isRange }
}
