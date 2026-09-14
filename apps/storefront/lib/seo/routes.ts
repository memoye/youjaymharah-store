import { getBaseURL } from "@/lib/util/env"

/**
 * Public page addresses, in one place so the sitemap, canonical links and
 * structured data agree with the routes. Update these if the page routes are
 * named differently.
 */
export const productPath = (handle: string) =>
  `/products/${encodeURIComponent(handle)}`

export const categoryPath = (handle: string) =>
  `/categories/${encodeURIComponent(handle)}`

export const collectionPath = (handle: string) =>
  `/collections/${encodeURIComponent(handle)}`

/** Pages search engines should not crawl: private or per-visitor. */
export const PRIVATE_PATHS = ["/api/", "/account", "/cart", "/checkout"]

/** An absolute URL on this storefront, e.g. for structured data. */
export const absoluteUrl = (path: string) =>
  new URL(path, getBaseURL()).toString()
