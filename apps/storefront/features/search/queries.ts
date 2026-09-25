import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import type {
  StoreSearchSuggestionsResponse,
  StoreSearchTrendingResponse,
} from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { queryKeys } from "@/lib/query/keys"

/** The route rejects anything shorter, so a request would be wasted. */
export const MIN_SUGGESTION_LENGTH = 2

export const searchQueries = {
  /**
   * As-you-type matches: a few products, plus categories and collections whose
   * names contain the term. No prices -- the index cannot resolve a region or
   * price list, so a row shows an image and a name and nothing else.
   */
  suggestions: (term: string) =>
    queryOptions({
      queryKey: queryKeys.search.suggestions(term),
      queryFn: (): Promise<StoreSearchSuggestionsResponse> =>
        getBrowserSdk().client.fetch<StoreSearchSuggestionsResponse>(
          "/store/search/suggestions",
          { query: { q: term } },
        ),
      // Holds the last rows on screen while the next term is in flight, so the
      // panel doesn't empty and refill on every keystroke.
      placeholderData: keepPreviousData,
      staleTime: 60_000,
      // /store/search/* is rate limited. Retrying spends the budget a shopper
      // needs for the search they actually submit.
      retry: false,
    }),

  /**
   * For the empty box: what shoppers search most, or the merchant's suggested
   * phrases until there is enough history to call anything popular.
   */
  trending: () =>
    queryOptions({
      queryKey: queryKeys.search.trending(),
      queryFn: (): Promise<StoreSearchTrendingResponse> =>
        getBrowserSdk().client.fetch<StoreSearchTrendingResponse>(
          "/store/search/trending",
        ),
      staleTime: 5 * 60_000,
      retry: false,
    }),
}
