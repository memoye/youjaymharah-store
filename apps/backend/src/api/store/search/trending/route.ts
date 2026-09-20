import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http";

import type { StoreSearchTrendingType } from "../../../middlewares";
import { SEARCH_INSIGHTS_MODULE } from "../../../../modules/search-insights";
import type SearchInsightsModuleService from "../../../../modules/search-insights/service";

/**
 * What shoppers have been searching for lately, busiest first, for an empty
 * search box.
 *
 * Built from submitted searches only, never from suggestion requests, and
 * from terms that actually found something. New stores answer with an empty
 * list until searches accumulate, so the storefront needs its own fallback.
 */
export const GET = async (
  req: MedusaStoreRequest<unknown, StoreSearchTrendingType>,
  res: MedusaResponse,
) => {
  const service: SearchInsightsModuleService = req.scope.resolve(
    SEARCH_INSIGHTS_MODULE,
  );

  const { limit } = req.validatedQuery;

  res.json({ terms: await service.listTrendingTerms({ limit }) });
};
