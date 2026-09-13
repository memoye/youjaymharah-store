import { queryOptions } from "@tanstack/react-query";
import type {
  ProductAlert,
  StoreProductAlertsResponse,
} from "@youjaymharah/api-types";

import { getBrowserSdk } from "@/lib/medusa/browser";
import { queryKeys } from "@/lib/query/keys";

export const productAlertQueries = {
  /**
   * The signed-in customer's waiting and sent alerts, newest first. Guests
   * have no list: their alerts are not tied to this browser.
   */
  mine: () =>
    queryOptions({
      queryKey: queryKeys.productAlerts.mine(),
      queryFn: async (): Promise<ProductAlert[]> =>
        (
          await getBrowserSdk().client.fetch<StoreProductAlertsResponse>(
            "/store/customers/me/product-alerts",
          )
        ).alerts,
      meta: { private: true },
    }),
};
