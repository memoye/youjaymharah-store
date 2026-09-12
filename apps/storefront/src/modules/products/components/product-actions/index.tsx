"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import {
  COLOUR_QUERY_KEY,
  getColourOption,
  getProductOptionValues,
} from "@lib/util/swatch"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import WishlistButton from "@modules/wishlist/components/wishlist-button"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  isLoggedIn?: boolean
  /** Wishlist item for this product, if the customer has saved it. */
  savedItemId?: string | null
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  isLoggedIn = false,
  savedItemId = null,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const colourOption = useMemo(() => getColourOption(product), [product])

  // Start on the colour named in ?colour= (e.g. a link from a product card),
  // so the page opens on that colour's photos. Read once, in the initial
  // state, so the URL-sync effect below never sees a half-applied selection.
  const [options, setOptions] = useState<Record<string, string | undefined>>(
    () => {
      const colour = searchParams.get(COLOUR_QUERY_KEY)
      const known =
        colourOption &&
        colour &&
        getProductOptionValues(product, colourOption).some(
          (v) => v.value === colour
        )

      return known ? { [colourOption.id]: colour } : {}
    }
  )
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const selectedColour = colourOption ? options[colourOption.id] : undefined

  // Mirror the selection into the URL: v_id once a full variant is chosen,
  // colour as soon as a colour is. The product page reads both to show that
  // variant's or colour's photos.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const variantId = isValidVariant ? selectedVariant?.id : null

    if (
      params.get("v_id") === (variantId ?? null) &&
      params.get(COLOUR_QUERY_KEY) === (selectedColour ?? null)
    ) {
      return
    }

    if (variantId) {
      params.set("v_id", variantId)
    } else {
      params.delete("v_id")
    }

    if (selectedColour) {
      params.set(COLOUR_QUERY_KEY, selectedColour)
    } else {
      params.delete(COLOUR_QUERY_KEY)
    }

    router.replace(pathname + "?" + params.toString(), { scroll: false })
  }, [selectedVariant, isValidVariant, selectedColour])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    setIsAdding(false)
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      product={product}
                      selected={options}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant
            ? "Select variant"
            : !inStock || !isValidVariant
            ? "Out of stock"
            : "Add to cart"}
        </Button>
        {!disabled && (
          <WishlistButton
            appearance="button"
            productId={product.id}
            productTitle={product.title}
            variantId={isValidVariant ? selectedVariant?.id : null}
            savedItemId={savedItemId}
            isLoggedIn={isLoggedIn}
          />
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
