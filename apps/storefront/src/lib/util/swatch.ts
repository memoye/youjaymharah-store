import { HttpTypes } from "@medusajs/types"

/**
 * Colour swatches come from the option value's metadata, set in the admin on
 * Products > Options > Colour > (value): `hex` for a flat colour, and
 * optionally `swatch_image` for prints and stripes.
 */
export type Swatch = { hex?: string; image?: string }

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

/** Product page search param holding the selected colour's name. */
export const COLOUR_QUERY_KEY = "colour"

export const isColourOption = (title?: string | null) =>
  !!title && /colou?r/i.test(title)

export const getSwatch = (
  value?: { metadata?: Record<string, unknown> | null } | null
): Swatch | null => {
  const hex = value?.metadata?.hex
  const image = value?.metadata?.swatch_image
  const swatch: Swatch = {
    hex: typeof hex === "string" && HEX_PATTERN.test(hex) ? hex : undefined,
    image: typeof image === "string" && image ? image : undefined,
  }

  return swatch.hex || swatch.image ? swatch : null
}

/**
 * The values of `option` this product actually comes in, in variant order.
 *
 * Needed because Colour and Size are shared options: the product's
 * `options[].values` can list every value on the shared option, not only the
 * ones this product was linked to.
 */
export const getProductOptionValues = (
  product: HttpTypes.StoreProduct,
  option: HttpTypes.StoreProductOption
): HttpTypes.StoreProductOptionValue[] => {
  const used: string[] = []

  for (const variant of product.variants ?? []) {
    for (const value of variant.options ?? []) {
      if (value.option_id === option.id && !used.includes(value.value)) {
        used.push(value.value)
      }
    }
  }

  if (!used.length) {
    return option.values ?? []
  }

  const byValue = new Map((option.values ?? []).map((v) => [v.value, v]))
  const fromVariants = new Map(
    (product.variants ?? [])
      .flatMap((v) => v.options ?? [])
      .filter((o) => o.option_id === option.id)
      .map((o) => [o.value, o])
  )

  return used.map(
    (value) =>
      byValue.get(value) ??
      (fromVariants.get(value) as HttpTypes.StoreProductOptionValue)
  )
}

export const getColourOption = (product: HttpTypes.StoreProduct) =>
  product.options?.find((option) => isColourOption(option.title))

const isPurchasable = (variant: HttpTypes.StoreProductVariant) =>
  !variant.manage_inventory ||
  !!variant.allow_backorder ||
  (variant.inventory_quantity ?? 0) > 0

/**
 * Whether any variant with this value -- and the other options the customer
 * has already chosen -- can be bought. Used to strike through sold-out
 * colours and sizes without hiding them.
 */
export const isOptionValueAvailable = (
  product: HttpTypes.StoreProduct,
  optionId: string,
  value: string,
  selected: Record<string, string | undefined>
) =>
  (product.variants ?? []).some((variant) => {
    const values = new Map(
      (variant.options ?? []).map((o) => [o.option_id, o.value])
    )

    if (values.get(optionId) !== value) {
      return false
    }

    const matchesOthers = Object.entries(selected).every(
      ([id, chosen]) => id === optionId || !chosen || values.get(id) === chosen
    )

    return matchesOthers && isPurchasable(variant)
  })
