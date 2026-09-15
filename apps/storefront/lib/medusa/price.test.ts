import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"

import { formatPrice, getProductPrice, getVariantPrice } from "./price"

type CalculatedPrice = NonNullable<
  HttpTypes.StoreProductVariant["calculated_price"]
>

function variant(
  id: string,
  amount: number | null,
  options: { original?: number; listType?: string | null } = {},
) {
  return {
    id,
    calculated_price:
      amount === null
        ? undefined
        : ({
            id: `price_${id}`,
            calculated_amount: amount,
            original_amount: options.original ?? amount,
            original_amount_with_tax: null,
            original_amount_without_tax: null,
            currency_code: "ngn",
            calculated_price: {
              id: null,
              price_list_id: options.listType ? "plist_1" : null,
              price_list_type: options.listType ?? null,
              min_quantity: null,
              max_quantity: null,
            },
          } as CalculatedPrice),
  }
}

describe("formatPrice", () => {
  it("formats naira without dividing and drops .00", () => {
    expect(formatPrice(45000, "ngn")).toBe("₦45,000")
  })

  it("keeps kobo when present", () => {
    expect(formatPrice(1250.5, "NGN")).toBe("₦1,250.50")
  })

  it("formats other currencies", () => {
    expect(formatPrice(120, "usd", "en-US")).toBe("$120")
  })
})

describe("getVariantPrice", () => {
  it("returns a regular price", () => {
    expect(getVariantPrice(variant("v1", 45000))).toEqual({
      amount: 45000,
      originalAmount: 45000,
      currencyCode: "ngn",
      isOnSale: false,
      percentOff: 0,
    })
  })

  it("marks a sale price list as a sale with percent off", () => {
    const price = getVariantPrice(
      variant("v1", 36000, { original: 45000, listType: "sale" }),
    )
    expect(price).toMatchObject({
      amount: 36000,
      originalAmount: 45000,
      isOnSale: true,
      percentOff: 20,
    })
  })

  it("does not strike through an override price list", () => {
    const price = getVariantPrice(
      variant("v1", 36000, { original: 45000, listType: "override" }),
    )
    expect(price).toMatchObject({
      amount: 36000,
      originalAmount: 36000,
      isOnSale: false,
      percentOff: 0,
    })
  })

  it("reports at least 1% off for tiny discounts", () => {
    expect(
      getVariantPrice(
        variant("v1", 44990, { original: 45000, listType: "sale" }),
      )?.percentOff,
    ).toBe(1)
  })

  it("returns null without a calculated price", () => {
    expect(getVariantPrice(variant("v1", null))).toBeNull()
  })
})

describe("getProductPrice", () => {
  const product = {
    variants: [
      variant("s", 45000),
      variant("m", 42000, { original: 48000, listType: "sale" }),
      variant("l", 48000),
    ],
  }

  it("shows the cheapest price as a range when variants differ", () => {
    expect(getProductPrice(product)).toMatchObject({
      price: { amount: 42000, isOnSale: true },
      isRange: true,
    })
  })

  it("uses the chosen variant", () => {
    expect(getProductPrice(product, "l")).toMatchObject({
      price: { amount: 48000 },
      isRange: false,
    })
  })

  it("falls back to the cheapest when the chosen variant is unknown", () => {
    expect(getProductPrice(product, "xl")?.price.amount).toBe(42000)
  })

  it("is not a range when every variant costs the same", () => {
    expect(
      getProductPrice({ variants: [variant("a", 10000), variant("b", 10000)] })
        ?.isRange,
    ).toBe(false)
  })

  it("returns null when nothing is priced", () => {
    expect(getProductPrice({ variants: [variant("a", null)] })).toBeNull()
    expect(getProductPrice({ variants: null })).toBeNull()
  })
})
