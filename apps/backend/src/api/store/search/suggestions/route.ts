import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";

import type { StoreSearchSuggestionsType } from "../../../middlewares";

/** Enough to render a suggestion row; the results page fetches the rest. */
const PRODUCT_FIELDS = ["id", "title", "handle", "thumbnail"];

/** Categories and collections shown above the product hits. */
const TAXONOMY_LIMIT = 3;

/**
 * Below this, Orama's edit distance of 1 matches almost anything: "dre"
 * would reach "tree". Short terms are prefix-matched instead, which is what a
 * shopper three letters into a word actually means.
 */
const TYPO_TOLERANCE_MIN_LENGTH = 4;

/**
 * As-you-type search suggestions: a few products, plus the categories and
 * collections whose names contain the term.
 *
 * Deliberately not `/store/search` with a small limit. No facets (a pass over
 * the whole result set that a dropdown never renders), no paging, and four
 * fields per hit. Prices are absent for the same reason as on the results
 * route: an index cannot resolve region, currency or price list.
 */
export const GET = async (
  req: MedusaStoreRequest<unknown, StoreSearchSuggestionsType>,
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

  const { q, limit } = req.validatedQuery;

  const [products, categories, collections] = await Promise.all([
    searchModule.search({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: {
        status: ProductStatus.PUBLISHED,
        sales_channel_ids: {
          $in: req.publishable_key_context.sales_channel_ids,
        },
        q,
      },
      pagination: { skip: 0, take: limit },
      search_options: {
        typo_tolerance: q.length >= TYPO_TOLERANCE_MIN_LENGTH,
      },
    }),
    listCategories(req, q),
    listCollections(req, q),
  ]);

  res.json({
    products: products.hits.map((hit) => hit.document),
    categories,
    collections,
    /** Every product the term matches, for a "See all results" row. */
    count: products.metadata.count ?? 0,
  });
};

/**
 * `%` and `_` are ILIKE wildcards, so a shopper typing them would otherwise
 * widen their own query instead of narrowing it.
 */
const toPattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

const listCategories = async (req: MedusaStoreRequest, q: string) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
    filters: {
      name: { $ilike: toPattern(q) },
      is_active: true,
      is_internal: false,
    },
    pagination: { skip: 0, take: TAXONOMY_LIMIT },
  });

  return data;
};

const listCollections = async (req: MedusaStoreRequest, q: string) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle"],
    filters: { title: { $ilike: toPattern(q) } },
    pagination: { skip: 0, take: TAXONOMY_LIMIT },
  });

  return data;
};
