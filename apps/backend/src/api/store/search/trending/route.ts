import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http";

import type { StoreSearchTrendingType } from "../../../middlewares";
import { getTrendingSearchTermsWorkflow } from "../../../../workflows/get-trending-search-terms";

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
  const { limit } = req.validatedQuery;
  const { result } = await getTrendingSearchTermsWorkflow(req.scope).run({
    input: {
      limit,
      sales_channel_ids: req.publishable_key_context.sales_channel_ids,
    },
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ terms: result });
};
