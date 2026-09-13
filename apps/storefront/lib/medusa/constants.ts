/**
 * Values shared by server and browser code. This module ends up in the client
 * bundle, so nothing secret belongs here -- the backend URL lives in
 * lib/medusa/server.ts for that reason.
 */

/** The storefront's own route that forwards Store API calls to Medusa. */
export const MEDUSA_PROXY_PATH = "/api/medusa";

/** Public by design: every Store API request carries it. */
export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

/** The customer's Medusa token. httpOnly, so browser code can never read it. */
export const AUTH_COOKIE = "_medusa_jwt";

/**
 * The active cart's id. Also httpOnly: Medusa lets anyone holding a guest
 * cart's id change that cart, so the id is treated like a credential.
 */
export const CART_COOKIE = "_medusa_cart_id";

/**
 * The id browser code passes for "the cart in CART_COOKIE". The proxy swaps in
 * the real id, so the browser never needs to know it.
 */
export const CURRENT_CART_ID = "current";
