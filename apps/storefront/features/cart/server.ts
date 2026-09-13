import "server-only";

import type { HttpTypes } from "@medusajs/types";

import { isNotFound } from "@/lib/medusa/errors";
import { getAuthHeaders, sdk } from "@/lib/medusa/server";
import { getCartId } from "@/lib/medusa/session";

/**
 * The server-side query function for `cartQueries.current()`. Use it to seed
 * the client cache from a Server Component, so the cart renders without a
 * browser round trip:
 *
 *   const queryClient = getQueryClient();
 *   void queryClient.prefetchQuery({
 *     ...cartQueries.current(),
 *     queryFn: fetchCartOnServer,
 *   });
 *   return (
 *     <HydrationBoundary state={dehydrate(queryClient)}>...</HydrationBoundary>
 *   );
 *
 * A stale cookie is left in place here: cookies cannot be changed while a
 * Server Component renders. The proxy clears it on the next browser request.
 */
export async function fetchCartOnServer(): Promise<HttpTypes.StoreCart | null> {
  const cartId = await getCartId();

  if (!cartId) {
    return null;
  }

  try {
    const { cart } = await sdk.store.cart.retrieve(
      cartId,
      {},
      await getAuthHeaders(),
    );

    return cart;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}
