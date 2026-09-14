import "server-only"

import type { StoreStorefrontSettingsResponse } from "@youjaymharah/api-types"
import { cache } from "react"

import { sdk } from "./server"

export type StorefrontSettings = StoreStorefrontSettingsResponse["settings"]

/** For on-demand revalidation (`revalidateTag`), should that ever be wired up. */
export const STOREFRONT_SETTINGS_TAG = "storefront-settings"

/**
 * How long a fetched copy is reused. An admin change shows up on the site
 * within this many seconds, without every page view asking the backend.
 */
const REVALIDATE_SECONDS = 300

/**
 * Used when the backend can't be reached, for example during a build with no
 * backend running, so the site still renders. Nothing here hides the store
 * from search engines.
 */
const FALLBACK: StorefrontSettings = {
  brand: {
    name: "YouJaymharah Trends",
    logo_url: null,
    favicon_url: null,
    support_email: null,
  },
  seo: {
    title: null,
    description: null,
    og_image_url: null,
    twitter_handle: null,
    social_links: {
      instagram: null,
      facebook: null,
      tiktok: null,
      x: null,
      youtube: null,
      pinterest: null,
    },
    allow_indexing: true,
    google_site_verification: null,
  },
  products: { new_badge_days: 30 },
}

/**
 * Everything staff set under Settings › Storefront in the admin: the brand,
 * sharing & search defaults, and product display settings. For Server
 * Components, metadata, `robots.ts` and `sitemap.ts`. Cached by Next for
 * REVALIDATE_SECONDS and shared by every visitor; it reads no cookies, so
 * pages stay cacheable.
 */
export const getStorefrontSettings = cache(
  async (): Promise<StorefrontSettings> => {
    try {
      const { settings } =
        await sdk.client.fetch<StoreStorefrontSettingsResponse>(
          "/store/storefront-settings",
          {
            next: {
              revalidate: REVALIDATE_SECONDS,
              tags: [STOREFRONT_SETTINGS_TAG],
            },
          },
        )

      return settings
    } catch (error) {
      console.error(
        "Storefront settings could not be loaded; rendering with defaults.",
        error,
      )

      return FALLBACK
    }
  },
)
