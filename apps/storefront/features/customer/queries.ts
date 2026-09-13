import type { HttpTypes } from "@medusajs/types";
import { queryOptions } from "@tanstack/react-query";

import { getBrowserSdk } from "@/lib/medusa/browser";
import { isUnauthorized } from "@/lib/medusa/errors";
import { queryKeys } from "@/lib/query/keys";

export const customerQueries = {
  /**
   * The signed-in customer, or null for a guest. Being a guest is not an error,
   * so a 401 resolves to null instead of rejecting.
   */
  me: () =>
    queryOptions({
      queryKey: queryKeys.customer.me(),
      queryFn: async (): Promise<HttpTypes.StoreCustomer | null> => {
        try {
          const { customer } = await getBrowserSdk().store.customer.retrieve();

          return customer;
        } catch (error) {
          if (isUnauthorized(error)) {
            return null;
          }

          throw error;
        }
      },
    }),
};
