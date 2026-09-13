import "server-only"

import type { StoreStorefrontSettingsResponse } from "@youjaymharah/api-types"
import { cache } from "react"

import { sdk } from "./server"

/**
 * Settings staff edit under Settings › Storefront in the admin, such as how
 * long a product shows the "New" badge. For Server Components: fetched once
 * per request (`React.cache`), and reads no cookies, so pages stay cacheable.
 */
export const getStorefrontSettings = cache(
  async (): Promise<StoreStorefrontSettingsResponse["settings"]> => {
    const { settings } =
      await sdk.client.fetch<StoreStorefrontSettingsResponse>(
        "/store/storefront-settings",
      )

    return settings
  },
)
