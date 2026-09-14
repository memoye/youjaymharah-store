import type { MetadataRoute } from "next"

import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"

/** Refreshed with the rest of the storefront settings. */
export const revalidate = 300

/** Home screens truncate app names around 12 characters. */
const SHORT_NAME_LIMIT = 12

function shortName(name: string): string {
  if (name.length <= SHORT_NAME_LIMIT) {
    return name
  }

  const firstWord = name.split(/\s+/)[0] ?? name
  return firstWord.slice(0, SHORT_NAME_LIMIT)
}

/**
 * The web app manifest (served at /manifest.webmanifest, linked from every
 * page by Next.js), used when a shopper adds the store to their phone's home
 * screen. Name, description and icon come from Settings › Storefront in the
 * admin; with no browser icon uploaded there, the phone falls back to a
 * screenshot-style icon.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand, seo } = await getStorefrontSettings()

  return {
    name: brand.name,
    short_name: shortName(brand.name),
    description: seo.description ?? undefined,
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Matches the site's background (--background in app/globals.css).
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: brand.favicon_url
      ? [
          {
            src: brand.favicon_url,
            // The admin asks for a square image of at least 512px.
            sizes: "512x512",
            purpose: "any",
          },
        ]
      : [],
  }
}
