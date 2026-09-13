import "server-only";

import type { HttpTypes } from "@medusajs/types";

import { isUnauthorized } from "@/lib/medusa/errors";
import { getAuthHeaders, sdk } from "@/lib/medusa/server";

/**
 * The server-side query function for `customerQueries.me()`: the signed-in
 * customer, or null for a guest. Prefetch it in a Server Component (see
 * features/cart/server.ts for the pattern) so the header renders signed-in on
 * the first paint instead of flashing "Sign in".
 */
export async function fetchCustomerOnServer(): Promise<HttpTypes.StoreCustomer | null> {
  const headers = await getAuthHeaders();

  if (!headers.authorization) {
    return null;
  }

  try {
    const { customer } = await sdk.store.customer.retrieve({}, headers);

    return customer;
  } catch (error) {
    if (isUnauthorized(error)) {
      return null;
    }

    throw error;
  }
}
