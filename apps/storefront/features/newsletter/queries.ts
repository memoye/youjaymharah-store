import { queryOptions } from "@tanstack/react-query"
import type { StoreNewsletterResponse } from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { queryKeys } from "@/lib/query/keys"

export const newsletterQueries = {
  /**
   * Whether signup is on, and the consent wording to show beside the form.
   * Changes only when someone edits the admin setting.
   */
  settings: () =>
    queryOptions({
      queryKey: queryKeys.newsletter.settings(),
      queryFn: async () =>
        (
          await getBrowserSdk().client.fetch<StoreNewsletterResponse>(
            "/store/newsletter",
          )
        ).newsletter,
      staleTime: 5 * 60_000,
    }),
}
