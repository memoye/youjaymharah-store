import type { HttpTypes } from "@medusajs/types"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A "coming soon" product: show "Notify me" instead of "Add to bag". The
 * backend refuses to sell it either way.
 *
 * The Store API leaves `metadata` out by default, so request it:
 * `fields: "+metadata"`. Without it this is always false.
 */
export function isComingSoon(
  product: Pick<HttpTypes.StoreProduct, "metadata">,
): boolean {
  return product.metadata?.coming_soon === true
}

/**
 * When the product went on sale: the moment it was launched from "coming
 * soon" (`metadata.launched_at`), otherwise when it was created. Medusa has no
 * publish date, so a product entered as a draft long before launch counts
 * from its creation. Needs `+metadata` for the launch date.
 */
export function onSaleSince(
  product: Pick<HttpTypes.StoreProduct, "metadata" | "created_at">,
): Date | null {
  const launchedAt = product.metadata?.launched_at
  const value = typeof launchedAt === "string" ? launchedAt : product.created_at
  const date = value ? new Date(value) : null

  return date && !Number.isNaN(date.getTime()) ? date : null
}

/**
 * Whether to show the "New" badge. `newBadgeDays` is the admin setting (from
 * `getStorefrontSettings()` in `lib/medusa/storefront-settings.ts`). Work it
 * out on the server and pass the result down: calling it in a Client Component
 * compares against the browser's clock, which can disagree with the render.
 *
 * A "New in" page sorts by `created_at` (`order: "-created_at"`), because the
 * Store API cannot sort by metadata. A product launched from coming soon may
 * therefore carry the badge while sitting lower on that page.
 */
export function isNew(
  product: Pick<HttpTypes.StoreProduct, "metadata" | "created_at">,
  newBadgeDays: number,
  now: number = Date.now(),
): boolean {
  if (isComingSoon(product)) {
    return false
  }

  const since = onSaleSince(product)

  return since !== null && now - since.getTime() < newBadgeDays * DAY_MS
}
