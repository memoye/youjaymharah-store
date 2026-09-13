/**
 * Product search index.
 *
 * Registered by importing: the application loads every file under `search/`
 * before boot and hands what was registered to the Search Module as its
 * `indexes` option.
 *
 * Deliberately product-level only. Variant text -- SKUs, colours, sizes --
 * would go stale between reindexes: editing a variant emits product-variant
 * events rather than product ones, and a deleted variant cannot be traced back
 * to its product once it is gone. Faceting on colour and size therefore needs
 * those events handled explicitly, which is a later change rather than a
 * half-measure that quietly serves wrong results.
 */
import type { SearchTypes } from "@medusajs/framework/types";
import {
  defineSearchIndex,
  ProductEvents,
  search,
} from "@medusajs/framework/utils";

/** Products per round trip while seeding. */
const SEED_PAGE_SIZE = 200;

/** Everything the index holds, in the shape `query.graph` returns it. */
const PRODUCT_FIELDS = [
  "id",
  "title",
  "subtitle",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "type.value",
  "collection.title",
  "collection.handle",
  "categories.name",
  "categories.handle",
  "tags.value",
  "sales_channels.id",
];

type ProductRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  handle: string;
  thumbnail: string | null;
  status: string;
  created_at: string | Date;
  type?: { value: string } | null;
  collection?: { title: string; handle: string } | null;
  categories?: ({ name: string; handle: string } | null)[] | null;
  tags?: ({ value: string } | null)[] | null;
  sales_channels?: ({ id: string } | null)[] | null;
};

const toDocument = (product: ProductRow) => ({
  id: product.id,
  title: product.title,
  subtitle: product.subtitle,
  description: product.description,
  handle: product.handle,
  thumbnail: product.thumbnail,
  status: product.status,
  created_at: product.created_at,
  type: product.type?.value ?? null,
  collection: product.collection?.title ?? null,
  collection_handle: product.collection?.handle ?? null,
  categories: (product.categories ?? []).flatMap((category) =>
    category ? [category.name] : [],
  ),
  category_handles: (product.categories ?? []).flatMap((category) =>
    category ? [category.handle] : [],
  ),
  tags: (product.tags ?? []).flatMap((tag) => (tag ? [tag.value] : [])),
  sales_channel_ids: (product.sales_channels ?? []).flatMap((channel) =>
    channel ? [channel.id] : [],
  ),
});

/**
 * Medusa emits `{ id }` for one entity and `{ ids }` for a batch, and which of
 * the two arrives depends on the workflow that raised it.
 */
const toIds = (data: unknown): string[] => {
  const payload = (data ?? {}) as { id?: string; ids?: string[] };

  if (payload.ids?.length) {
    return payload.ids;
  }

  return payload.id ? [payload.id] : [];
};

export default defineSearchIndex({
  name: "product",
  entity: "product",
  primary_key: "id",
  fields: search.define({
    // Weights are relative, and only matter between searchable fields: a hit
    // on the title should outrank the same word buried in a description.
    title: search.text().searchable({ weight: 5 }),
    subtitle: search.text().searchable({ weight: 3 }),
    description: search.text().searchable(),
    type: search.keyword().searchable({ weight: 2 }).filterable().facetable(),
    collection: search.keyword().searchable({ weight: 2 }).facetable(),
    categories: search.keyword().searchable({ weight: 2 }).facetable().array(),
    tags: search.keyword().searchable().filterable().facetable().array(),

    // Returned and filtered on, never matched as text.
    id: search.keyword().filterable(),
    handle: search.keyword().filterable(),
    thumbnail: search.keyword(),
    status: search.keyword().filterable(),
    created_at: search.date().sortable(),
    collection_handle: search.keyword().filterable(),
    category_handles: search.keyword().filterable().array(),
    // Products reach a storefront through a sales channel, so results have to
    // be narrowed to the channels the caller's publishable key allows.
    sales_channel_ids: search.keyword().filterable().array(),
  }),

  events: [
    ProductEvents.PRODUCT_CREATED,
    ProductEvents.PRODUCT_UPDATED,
    ProductEvents.PRODUCT_DELETED,
  ],

  async consume(event, { container }): Promise<SearchTypes.SearchMutation[]> {
    const ids = toIds(event.data);

    if (!ids.length) {
      return [];
    }

    if (event.name === ProductEvents.PRODUCT_DELETED) {
      return [{ action: "delete", filters: { id: ids } }];
    }

    const { data } = await container.query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { id: ids },
    });

    return [
      { action: "upsert", documents: (data as ProductRow[]).map(toDocument) },
    ];
  },

  /**
   * Walks the catalogue by id rather than by offset: the module records the
   * last id of every batch, so an interrupted seed resumes from `last_key`
   * instead of starting over, and a row inserted mid-run cannot shift a page
   * boundary and hide a product.
   */
  async *seed({ container, filters, last_key }) {
    let cursor = last_key;

    for (;;) {
      const { data } = await container.query.graph({
        entity: "product",
        fields: PRODUCT_FIELDS,
        filters: {
          ...filters,
          ...(cursor ? { id: { $gt: cursor } } : {}),
        },
        pagination: { take: SEED_PAGE_SIZE, order: { id: "ASC" } },
      });

      if (!data.length) {
        return;
      }

      yield (data as ProductRow[]).map(toDocument);

      if (data.length < SEED_PAGE_SIZE) {
        return;
      }

      cursor = data[data.length - 1].id;
    }
  },
});
