import "server-only";

import type { StoreSizeGuideResponse } from "@youjaymharah/api-types";

import { isNotFound } from "@/lib/medusa/errors";
import { sdk } from "@/lib/medusa/server";

/**
 * The size guide for a product page, from a Server Component. Reads no
 * cookies, so a cached catalogue page stays cached. Also usable as the
 * `queryFn` override when prefetching `sizeGuideQueries.forProduct()`.
 */
export async function fetchSizeGuideOnServer(
  productId: string,
): Promise<StoreSizeGuideResponse> {
  try {
    return await sdk.client.fetch<StoreSizeGuideResponse>(
      `/store/products/${encodeURIComponent(productId)}/size-guide`,
    );
  } catch (error) {
    if (isNotFound(error)) {
      return { size_guide: null, source: null };
    }

    throw error;
  }
}
