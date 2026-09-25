"use client"

import type { HttpTypes } from "@medusajs/types"
import { parseAsString, useQueryStates } from "nuqs"
import { useCallback, useMemo } from "react"

import {
  findVariant,
  getOptionChoices,
  type OptionSelection,
} from "@/lib/medusa/variants"

/** "Colour" is kept in the URL as `?colour=Black`. */
function paramName(optionTitle: string): string {
  return optionTitle.toLowerCase()
}

/**
 * The product page's chosen options, kept in the URL (`?colour=Black&size=M`)
 * so a shared link opens on the same variant and the back button undoes a
 * choice.
 *
 * - Values that aren't a real choice for this product are ignored.
 * - An option with a single choice (such as One Size) is chosen automatically.
 * - `variant` is set once every option is chosen.
 *
 * It reads the URL, so render the component that calls it inside a
 * `<Suspense>` boundary; otherwise a production build fails for prerendered
 * pages. The product needs `*options` and `*variants.options` in `fields`
 * (`getProductByHandle` requests them).
 *
 * Updates are shallow: the page's server render doesn't depend on the chosen
 * variant, so a tap on a swatch changes the URL without a round trip for it.
 */
export function useProductSelection(product: HttpTypes.StoreProduct) {
  // One key per option this product has, so unrelated query params -- `q`
  // among them -- are neither read nor touched.
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        (product.options ?? []).map((option) => [
          paramName(option.title),
          parseAsString,
        ]),
      ),
    [product],
  )

  const [params, setParams] = useQueryStates(parsers, {
    // Replace rather than push: each tap on a swatch shouldn't become a
    // back-button step, and the page shouldn't jump to the top.
    history: "replace",
    scroll: false,
  })

  const selection = useMemo<OptionSelection>(() => {
    const chosen: OptionSelection = {}

    for (const option of product.options ?? []) {
      const values = getOptionChoices(product, option.title).map(
        (choice) => choice.value,
      )
      const fromUrl = params[paramName(option.title)]

      if (fromUrl && values.includes(fromUrl)) {
        chosen[option.title] = fromUrl
      } else if (values.length === 1) {
        chosen[option.title] = values[0]
      }
    }

    return chosen
  }, [product, params])

  const variant = useMemo(
    () => findVariant(product, selection),
    [product, selection],
  )

  /** Choose a value, or pass null to clear the option. */
  const setOption = useCallback(
    (optionTitle: string, value: string | null) => {
      void setParams({ [paramName(optionTitle)]: value })
    },
    [setParams],
  )

  return { selection, variant, setOption }
}
