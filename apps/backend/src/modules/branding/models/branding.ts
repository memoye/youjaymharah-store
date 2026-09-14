import { model } from "@medusajs/framework/utils";

/**
 * Store branding. This is a singleton: exactly one row, addressed by
 * BRANDING_ID, edited in the Brand section of Settings -> Storefront.
 *
 * Per-product brands are deliberately not modelled here. The store sells its
 * own label only, and keeping store identity as its own resource is what lets
 * RBAC grant catalog access without also handing over the store's name, logo
 * and support address.
 */
export const Branding = model.define("branding", {
  id: model.id().primaryKey(),
  name: model.text(),
  logo_url: model.text().nullable(),
  /** The browser tab icon. A square PNG, at least 512px, works everywhere. */
  favicon_url: model.text().nullable(),
  support_email: model.text().nullable(),
});
