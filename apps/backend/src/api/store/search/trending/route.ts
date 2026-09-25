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
 * from terms that actually found something. Until searches accumulate, the
 * merchant's suggested phrases stand in, marked `source: "curated"` so the
 * storefront doesn't present them as popular.
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
  res.json(result);
};
