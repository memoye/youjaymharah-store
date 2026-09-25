import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { Modules, ProductStatus } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import { SEARCH_INSIGHTS_MODULE } from "../modules/search-insights";
import type SearchInsightsModuleService from "../modules/search-insights/service";

type TrendingInput = { limit: number; sales_channel_ids: string[] };

type TrendingTerms = {
  terms: string[];
  /** Shoppers' searches, or the merchant's fallback when there are none. */
  source: "trending" | "curated";
};

/**
 * Keeps the terms that currently find a published product in the requesting
 * channels. A suggestion that leads to an empty results page is worse than no
 * suggestion, whoever chose it.
 */
async function withPublishedMatches(
  terms: string[],
  input: TrendingInput,
  search: NonNullable<ReturnType<typeof resolveSearch>>,
): Promise<string[]> {
  const visible = await Promise.all(
    terms.map(async (term) => {
      const result = await search.search({
        entity: "product",
        fields: ["id"],
        filters: {
          status: ProductStatus.PUBLISHED,
          sales_channel_ids: { $in: input.sales_channel_ids },
          q: term,
        },
        pagination: { skip: 0, take: 1 },
      });
      return result.hits.length > 0 ? term : null;
    }),
  );
  return visible.filter((term): term is string => term !== null);
}

const resolveSearch = (container: MedusaContainer) =>
  container.resolve(Modules.SEARCH, { allowUnregistered: true });

const clampLimit = (limit: number) => Math.max(1, Math.min(20, limit));

export async function visibleTrendingTerms(
  input: TrendingInput,
  container: MedusaContainer,
): Promise<string[]> {
  if (!input.sales_channel_ids.length) return [];
  const search = resolveSearch(container);
  if (!search) return [];
  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  const terms = await service.listTrendingTerms({
    limit: clampLimit(input.limit),
  });
  return withPublishedMatches(terms, input, search);
}

/**
 * Trending when shoppers have produced any, otherwise the merchant's
 * suggested phrases. The fallback is read only when it is needed, and filtered
 * the same way, so a curated term with nothing behind it stays hidden too.
 */
export async function trendingSearchTerms(
  input: TrendingInput,
  container: MedusaContainer,
): Promise<TrendingTerms> {
  const trending = await visibleTrendingTerms(input, container);
  if (trending.length) return { terms: trending, source: "trending" };

  if (!input.sales_channel_ids.length) return { terms: [], source: "trending" };
  const search = resolveSearch(container);
  if (!search) return { terms: [], source: "trending" };

  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  const fallback = (await service.readFallbackTerms()).terms.slice(
    0,
    clampLimit(input.limit),
  );
  const curated = await withPublishedMatches(fallback, input, search);

  return curated.length
    ? { terms: curated, source: "curated" }
    : { terms: [], source: "trending" };
}

const getTrendingSearchTermsStep = createStep(
  "get-trending-search-terms",
  async (input: TrendingInput, { container }) =>
    new StepResponse(await trendingSearchTerms(input, container)),
);

export const getTrendingSearchTermsWorkflow = createWorkflow(
  "get-trending-search-terms",
  (input: TrendingInput) => {
    const terms = getTrendingSearchTermsStep(input);
    return new WorkflowResponse(terms);
  },
);
