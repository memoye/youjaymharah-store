import type { MetadataRoute } from "next"

import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"
import { absoluteUrl, PRIVATE_PATHS } from "@/lib/seo/routes"
import { getBaseURL } from "@/lib/util/env"

/** Regenerated at most hourly, picking up the admin's indexing switch. */
export const revalidate = 3600

/**
 * robots.txt. With "Show the store in search engines" switched off in the
 * admin, every crawler is asked to stay away; otherwise only private pages
 * are excluded and crawlers are pointed at the sitemap.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getStorefrontSettings()

  if (!settings.seo.allow_indexing) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getBaseURL(),
  }
}
