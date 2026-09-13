import { queryOptions } from "@tanstack/react-query";
import type { StoreSizeGuideResponse } from "@youjaymharah/api-types";

import { getBrowserSdk } from "@/lib/medusa/browser";
import { isNotFound } from "@/lib/medusa/errors";
import { queryKeys } from "@/lib/query/keys";

export const sizeGuideQueries = {
  /**
   * The guide a product page shows, or `size_guide: null` when none applies
   * (hide the link then). The same for every shopper, so it is not private.
   */
  forProduct: (productId: string) =>
    queryOptions({
      queryKey: queryKeys.sizeGuide.product(productId),
      queryFn: async (): Promise<StoreSizeGuideResponse> => {
        try {
          return await getBrowserSdk().client.fetch<StoreSizeGuideResponse>(
            `/store/products/${encodeURIComponent(productId)}/size-guide`,
          );
        } catch (error) {
          if (isNotFound(error)) {
            return { size_guide: null, source: null };
          }

          throw error;
        }
      },
      // Guides change rarely; a product page can keep one for a while.
      staleTime: 10 * 60 * 1000,
    }),
};
