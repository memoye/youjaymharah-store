import "server-only"

import Medusa from "@medusajs/js-sdk"

import { PUBLISHABLE_KEY } from "./constants"
import { getAuthToken } from "./session"

/**
 * Where the Next.js server reaches Medusa. In production, the backend's
 * address on the Docker network, so server-to-server calls never leave the
 * host.
 */
export const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"

/**
 * The SDK for Server Components and Route Handlers.
 *
 * One instance serves every request, which is safe only because it never holds
 * a token: with `nostore`, the SDK's token setter stores nothing, so one
 * customer's token cannot linger into another request. Pass each request's
 * credentials explicitly with `getAuthHeaders()`.
 */
export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  auth: { type: "jwt", jwtTokenStorageMethod: "nostore" },
})

/** The signed-in customer's Authorization header, or none for a guest. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()

  return token ? { authorization: `Bearer ${token}` } : {}
}
