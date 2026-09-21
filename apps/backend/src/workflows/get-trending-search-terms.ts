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

export async function visibleTrendingTerms(
  input: TrendingInput,
  container: MedusaContainer,
): Promise<string[]> {
  if (!input.sales_channel_ids.length) return [];
  const search = container.resolve(Modules.SEARCH, { allowUnregistered: true });
  if (!search) return [];
  const service: SearchInsightsModuleService = container.resolve(
    SEARCH_INSIGHTS_MODULE,
  );
  const terms = await service.listTrendingTerms({
    limit: Math.max(1, Math.min(20, input.limit)),
  });
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

const getTrendingSearchTermsStep = createStep(
  "get-trending-search-terms",
  async (input: TrendingInput, { container }) =>
    new StepResponse(await visibleTrendingTerms(input, container)),
);

export const getTrendingSearchTermsWorkflow = createWorkflow(
  "get-trending-search-terms",
  (input: TrendingInput) => {
    const terms = getTrendingSearchTermsStep(input);
    return new WorkflowResponse(terms);
  },
);
