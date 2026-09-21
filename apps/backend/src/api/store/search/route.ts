import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http";
import type { SearchTypes } from "@medusajs/framework/types";
import { MedusaError, Modules, ProductStatus } from "@medusajs/framework/utils";

import type { StoreSearchProductsType } from "../../middlewares";
import { SEARCH_PERFORMED_EVENT } from "../../../subscribers/search-performed";
import { approvedSearchTerm } from "../../../modules/search-insights/approved-terms";

/**
 * Faceted so a results page can offer refinements next to the hits, and count
 * them, without a second query per facet.
 */
const FACETS = ["categories", "type", "collection", "tags"];

/**
 * Storefront product search.
 *
 * Returns what the index holds, which is enough to render a results grid.
 * Prices are deliberately absent: they depend on region, currency and any
 * active price list, none of which an index can resolve. Fetch them from
 * `/store/products?id=...` with the shopper's region once the ids are known.
 */
export const GET = async (
  req: MedusaStoreRequest<unknown, StoreSearchProductsType>,
  res: MedusaResponse,
) => {
  const searchModule = req.scope.resolve(Modules.SEARCH, {
    allowUnregistered: true,
  });

  if (!searchModule) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Product search is unavailable: the Search Module is not configured.",
    );
  }

  const { q, limit, offset, category, type, collection, tag } =
    req.validatedQuery;

  const filters: SearchTypes.SearchFilters = {
    // Drafts and rejected products are indexed too -- the index mirrors the
    // catalogue rather than one audience's view of it -- so a storefront has
    // to say which of them it wants.
    status: ProductStatus.PUBLISHED,
    // Products reach a storefront through a sales channel, and the
    // publishable key decides which. Without this every channel's catalogue
    // would answer every storefront.
    sales_channel_ids: { $in: req.publishable_key_context.sales_channel_ids },
    ...(q ? { q } : {}),
    ...(category?.length ? { category_handles: { $in: category } } : {}),
    ...(type?.length ? { type: { $in: type } } : {}),
    ...(collection?.length ? { collection_handle: { $in: collection } } : {}),
    ...(tag?.length ? { tags: { $in: tag } } : {}),
  };

  const result = await searchModule.search({
    entity: "product",
    // Everything the index can return, so the hits need no second trip to the
    // database to be rendered.
    fields: searchModule.listRetrievableFields("product"),
    filters,
    pagination: { skip: offset, take: limit },
    search_options: {
      facets: FACETS,
      // Shoppers type product names from memory, so one typo should still
      // match.
      typo_tolerance: true,
    },
  });

  if (q) {
    await recordTerm(req, q, result.metadata.count ?? 0);
  }

  res.json({
    products: result.hits.map((hit) => hit.document),
    count: result.metadata.count ?? 0,
    offset: result.metadata.skip,
    limit: result.metadata.take,
    facets: result.facets ?? {},
  });
};

/**
 * Counts the search towards the trending terms. Emitted rather than written
 * here so the shopper's response does not wait on it, and swallowed because a
 * tally is never worth failing a search over.
 */
const recordTerm = async (
  req: MedusaStoreRequest<unknown, StoreSearchProductsType>,
  term: string,
  resultCount: number,
) => {
  try {
    const approved = approvedSearchTerm(term);
    if (!approved || !Number.isSafeInteger(resultCount) || resultCount < 0)
      return;
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: SEARCH_PERFORMED_EVENT,
      data: { term: approved, result_count: resultCount },
    });
  } catch {
    // The search itself succeeded; the tally is not worth a 500.
  }
};
