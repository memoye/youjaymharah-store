/**
 * Fallbacks only. The live values come from the `branding` module and are
 * passed into each template as a `brand` prop by the subscriber that sends it.
 * These keep an email readable if branding has not been set yet, or if a
 * caller renders a template without one.
 */
export const STORE_NAME = process.env.STORE_NAME ?? "Youjaymharah";
export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? "support@youjaymharah.com";
export const STOREFRONT_URL =
  process.env.STOREFRONT_URL ?? "http://localhost:8000";
/** Base URL of the admin dashboard, used for invite and staff reset links. */
export const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:9000";

/** The branding fields an email needs. Mirrors the `branding` model. */
export type BrandSummary = {
  name?: string | null;
  logo_url?: string | null;
  support_email?: string | null;
};
