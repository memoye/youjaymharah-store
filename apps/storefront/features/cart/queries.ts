import type { HttpTypes } from "@medusajs/types";
import { queryOptions } from "@tanstack/react-query";

import { getBrowserSdk } from "@/lib/medusa/browser";
import { CURRENT_CART_ID } from "@/lib/medusa/constants";
import { isNotFound } from "@/lib/medusa/errors";
import { queryKeys } from "@/lib/query/keys";

export const cartQueries = {
  /**
   * The cart in the httpOnly cookie, or null when there is none yet (or it was
   * completed or deleted). Having no cart is normal, so a 404 resolves to null.
   */
  current: () =>
    queryOptions({
      queryKey: queryKeys.cart.current(),
      queryFn: async (): Promise<HttpTypes.StoreCart | null> => {
        try {
          const { cart } =
            await getBrowserSdk().store.cart.retrieve(CURRENT_CART_ID);

          return cart;
        } catch (error) {
          if (isNotFound(error)) {
            return null;
          }

          throw error;
        }
      },
    }),
};
