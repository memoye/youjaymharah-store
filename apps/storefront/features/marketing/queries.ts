import { queryOptions } from "@tanstack/react-query"
import type {
  MarketingPreference,
  StoreMarketingPreferenceResponse,
} from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { queryKeys } from "@/lib/query/keys"

export const marketingQueries = {
  /**
   * The signed-in customer's marketing email status: "none", "pending" (a
   * confirmation email is waiting to be clicked), "subscribed" or
   * "unsubscribed". `available` is false while signup is off in the admin.
   */
  preference: () =>
    queryOptions({
      queryKey: queryKeys.marketing.preference(),
      queryFn: async (): Promise<MarketingPreference> =>
        (
          await getBrowserSdk().client.fetch<StoreMarketingPreferenceResponse>(
            "/store/customers/me/marketing",
          )
        ).marketing,
      meta: { private: true },
    }),
}
