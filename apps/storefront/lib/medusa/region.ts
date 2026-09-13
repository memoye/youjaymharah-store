import "server-only"

import type { HttpTypes } from "@medusajs/types"
import { cache } from "react"

import { sdk } from "./server"

/** The store sells to one country, so every price comes from one region. */
const STORE_COUNTRY = "ng"

/**
 * The region prices are calculated in, for Server Components. Fetched once per
 * request however many components ask (`React.cache`), and it reads no
 * cookies, so catalogue pages stay cacheable.
 *
 * This replaces the Medusa starter's country-code routing: with one country, a
 * `/ng/` prefix on every URL would add a redirect and nothing else. When the
 * store sells to more countries, choose the region per visitor here and add a
 * country segment to the routes.
 */
export const getStoreRegion = cache(
  async (): Promise<HttpTypes.StoreRegion> => {
    const { regions } = await sdk.store.region.list({
      fields: "id,name,currency_code,*countries",
    })

    const region =
      regions.find((candidate) =>
        candidate.countries?.some((country) => country.iso_2 === STORE_COUNTRY),
      ) ?? regions[0]

    if (!region) {
      throw new Error(
        "The store has no region. Run `pnpm exec medusa db:migrate` in apps/backend so the initial data seed creates it.",
      )
    }

    return region
  },
)
