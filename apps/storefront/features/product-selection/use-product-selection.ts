"use client"

import type { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
 * It reads `useSearchParams`, so render the component that calls it inside a
 * `<Suspense>` boundary; otherwise a production build fails for prerendered
 * pages. The product needs `*options` and `*variants.options` in `fields`
 * (`getProductByHandle` requests them).
 */
export function useProductSelection(product: HttpTypes.StoreProduct) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selection = useMemo<OptionSelection>(() => {
    const chosen: OptionSelection = {}

    for (const option of product.options ?? []) {
      const values = getOptionChoices(product, option.title).map(
        (choice) => choice.value,
      )
      const fromUrl = searchParams.get(paramName(option.title))

      if (fromUrl && values.includes(fromUrl)) {
        chosen[option.title] = fromUrl
      } else if (values.length === 1) {
        chosen[option.title] = values[0]
      }
    }

    return chosen
  }, [product, searchParams])

  const variant = useMemo(
    () => findVariant(product, selection),
    [product, selection],
  )

  /** Choose a value, or pass null to clear the option. */
  const setOption = useCallback(
    (optionTitle: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set(paramName(optionTitle), value)
      } else {
        params.delete(paramName(optionTitle))
      }

      const query = params.toString()
      // Replace rather than push: each tap on a swatch shouldn't become a
      // back-button step, and the page shouldn't jump to the top.
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router, searchParams],
  )

  return { selection, variant, setOption }
}
