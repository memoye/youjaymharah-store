import { model } from "@medusajs/framework/utils";

/**
 * Merchandising settings the storefront reads. A singleton like branding:
 * one row, addressed by STOREFRONT_SETTINGS_ID, edited from
 * Settings -> Storefront.
 *
 * Kept apart from branding on purpose: branding is store identity and
 * owner-only, while these are day-to-day decisions for the Store Manager and
 * Marketing.
 */
export const StorefrontSettings = model.define("storefront_settings", {
  id: model.id().primaryKey(),
  /** How many days a product shows the "New" badge after it goes on sale. */
  new_badge_days: model.number().default(30),
});
