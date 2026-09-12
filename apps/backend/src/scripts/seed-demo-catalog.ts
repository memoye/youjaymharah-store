import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PriceListStatus,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  batchImageVariantsWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createProductTagsWorkflow,
  createProductTypesWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  deletePriceListsWorkflow,
  deleteProductsWorkflow,
  updateProductOptionsWorkflow,
  updateProductOptionValuesWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

import {
  COLOUR_OPTION,
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_COLOURS,
  DEMO_PRICE_LISTS,
  DEMO_PRODUCTS,
  DEMO_TAGS,
  NGN_PER_USD,
  SIZE_OPTION,
  SIZE_ORDER,
  type DemoProduct,
} from "./data/demo-catalog";

/**
 * Seeds a demo womenswear catalog for storefront development:
 *
 *   pnpm run seed:demo          (from apps/backend)
 *   pnpm run seed:demo reset    deletes the demo products and sale first,
 *                               then recreates them from the data file
 *
 * Creates categories, collections, product types and tags, shared Colour and
 * Size options (each colour's swatch hex in its value metadata), ~45
 * published products with Colour x Size variants priced in NGN and USD,
 * colour-specific variant images and thumbnails, stock at the store's stock
 * location (including sold-out and low-stock variants), a sale price list,
 * and -- only if the store has no shipping options yet -- a standard and an
 * express delivery option for Nigeria so checkout can be completed end to end.
 *
 * Requires the initial data seed (store, default sales channel, NGN region,
 * stock location) to have run. Idempotent: anything that already exists,
 * matched by handle/value/title, is left untouched.
 *
 * Dev data only -- do not run against production.
 */
export default async function seedDemoCatalog({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (args?.some((arg) => arg.replace(/^-+/, "") === "reset")) {
    await resetDemoCatalog(container);
  }

  const context = await resolveStoreContext(container);
  const shippingProfileId = await ensureShippingProfile(container);
  await ensureShippingOptions(container, context, shippingProfileId);

  const categoryIds = await ensureCategories(container);
  const collectionIds = await ensureCollections(container);
  const typeIds = await ensureProductTypes(container);
  const tagIds = await ensureProductTags(container);
  const sharedOptions = await ensureSharedOptions(container);

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: DEMO_PRODUCTS.map((p) => p.handle) },
  });
  const existingHandles = new Set(existingProducts.map((p) => p.handle));
  const newProducts = DEMO_PRODUCTS.filter(
    (p) => !existingHandles.has(p.handle),
  );

  if (newProducts.length) {
    logger.info(`Creating ${newProducts.length} demo products...`);
    // Batched so a single failure does not roll back the whole catalog and
    // each workflow transaction stays a reasonable size.
    for (const batch of chunk(newProducts, 8)) {
      await createProductsWorkflow(container).run({
        input: {
          products: batch.map((product) => ({
            title: product.title,
            handle: product.handle,
            description: product.description,
            status: ProductStatus.PUBLISHED,
            material: product.material,
            thumbnail: product.images[0],
            images: product.images.map((url) => ({ url })),
            category_ids: [categoryIds.get(product.category)!],
            collection_id: product.collection
              ? collectionIds.get(product.collection)
              : undefined,
            type_id: typeIds.get(product.type),
            tag_ids: (product.tags ?? []).map((tag) => tagIds.get(tag)!),
            shipping_profile_id: shippingProfileId,
            sales_channels: [{ id: context.salesChannelId }],
            // Link the shared options, limited to the values this product
            // actually comes in; variants still name values by option title.
            options: [
              {
                id: sharedOptions.colour.id,
                value_ids: product.colours.map((c) =>
                  sharedOptions.colour.valueIds.get(c.name)!,
                ),
              },
              {
                id: sharedOptions.size.id,
                value_ids: product.sizes.map((s) =>
                  sharedOptions.size.valueIds.get(s)!,
                ),
              },
            ],
            variants: buildVariants(product),
            metadata: { fit: product.fit, care: product.care },
          })),
        },
      });
    }
    await stockNewProducts(container, context.stockLocationId, newProducts);
    await assignColourImages(container, newProducts);
  } else {
    logger.info("All demo products already exist; skipping product creation.");
  }

  await ensurePriceLists(container);

  logger.info(
    `Demo catalog ready: ${DEMO_PRODUCTS.length} products across ${DEMO_CATEGORIES.length} categories and ${DEMO_COLLECTIONS.length} collections.`,
  );
}

type StoreContext = {
  salesChannelId: string;
  regionId: string;
  stockLocationId: string;
};

async function resolveStoreContext(
  container: MedusaContainer,
): Promise<StoreContext> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [store],
  } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id"],
  });
  const {
    data: [region],
  } = await query.graph({
    entity: "region",
    fields: ["id"],
    filters: { currency_code: "ngn" },
  });
  const {
    data: [stockLocation],
  } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });

  if (!store?.default_sales_channel_id || !region || !stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Store, default sales channel, NGN region or stock location missing. Run `pnpm exec medusa db:migrate` so the initial data seed runs first.",
    );
  }

  return {
    salesChannelId: store.default_sales_channel_id,
    regionId: region.id,
    stockLocationId: stockLocation.id,
  };
}

async function ensureShippingProfile(container: MedusaContainer) {
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const [existing] = await fulfillmentModule.listShippingProfiles({
    type: "default",
  });
  if (existing) {
    return existing.id;
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
  });
  return result[0].id;
}

/**
 * Checkout needs at least one shipping option. Skipped entirely once the
 * store has any, so options configured in the dashboard are never touched.
 */
async function ensureShippingOptions(
  container: MedusaContainer,
  context: StoreContext,
  shippingProfileId: string,
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id"],
    pagination: { take: 1 },
  });
  if (existingOptions.length) {
    logger.info("Shipping options already exist; skipping shipping setup.");
    return;
  }

  const findShippingSet = async () => {
    const {
      data: [location],
    } = await query.graph({
      entity: "stock_location",
      fields: [
        "fulfillment_sets.id",
        "fulfillment_sets.type",
        "fulfillment_sets.service_zones.id",
      ],
      filters: { id: context.stockLocationId },
    });
    return location?.fulfillment_sets?.find((set) => set?.type === "shipping");
  };

  let fulfillmentSet = await findShippingSet();
  if (!fulfillmentSet) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: context.stockLocationId,
        fulfillment_set_data: { name: "Nigeria delivery", type: "shipping" },
      },
    });
    fulfillmentSet = await findShippingSet();
  }

  let serviceZoneId = fulfillmentSet!.service_zones?.[0]?.id;
  if (!serviceZoneId) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            fulfillment_set_id: fulfillmentSet!.id,
            name: "Nigeria",
            geo_zones: [{ type: "country", country_code: "ng" }],
          },
        ],
      },
    });
    serviceZoneId = result[0].id;
  }

  const option = (
    name: string,
    code: string,
    description: string,
    ngn: number,
    usd: number,
  ) => ({
    name,
    price_type: "flat" as const,
    provider_id: "manual_manual",
    service_zone_id: serviceZoneId!,
    shipping_profile_id: shippingProfileId,
    type: { label: name, description, code },
    prices: [
      { currency_code: "ngn", amount: ngn },
      { currency_code: "usd", amount: usd },
      { region_id: context.regionId, amount: ngn },
    ],
    rules: [
      { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
      { attribute: "is_return", value: "false", operator: "eq" as const },
    ],
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      option("Standard Delivery", "standard", "3-5 business days", 3500, 5),
      option("Express Delivery", "express", "1-2 business days", 7500, 10),
    ],
  });
  logger.info("Created Standard and Express delivery options for Nigeria.");
}

async function ensureCategories(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: DEMO_CATEGORIES.map((c) => c.handle) },
  });
  const ids = new Map(existing.map((c) => [c.handle, c.id]));

  // DEMO_CATEGORIES lists parents before children, so each parent id is
  // known by the time its children are created.
  for (const [rank, category] of DEMO_CATEGORIES.entries()) {
    if (ids.has(category.handle)) {
      continue;
    }
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: category.name,
            handle: category.handle,
            description: category.description,
            is_active: true,
            rank,
            parent_category_id: category.parent
              ? ids.get(category.parent)
              : null,
          },
        ],
      },
    });
    ids.set(category.handle, result[0].id);
  }
  return ids;
}

async function ensureCollections(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: existing } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: DEMO_COLLECTIONS.map((c) => c.handle) },
  });
  const ids = new Map(existing.map((c) => [c.handle, c.id]));

  const missing = DEMO_COLLECTIONS.filter((c) => !ids.has(c.handle));
  if (missing.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: missing.map((c) => ({
          title: c.title,
          handle: c.handle,
          metadata: { description: c.description, hero_image: c.heroImage },
        })),
      },
    });
    result.forEach((c) => ids.set(c.handle, c.id));
  }
  return ids;
}

async function ensureProductTypes(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const values = [...new Set(DEMO_PRODUCTS.map((p) => p.type))];
  const { data: existing } = await query.graph({
    entity: "product_type",
    fields: ["id", "value"],
    filters: { value: values },
  });
  const ids = new Map(existing.map((t) => [t.value, t.id]));

  const missing = values.filter((v) => !ids.has(v));
  if (missing.length) {
    const { result } = await createProductTypesWorkflow(container).run({
      input: { product_types: missing.map((value) => ({ value })) },
    });
    result.forEach((t) => ids.set(t.value, t.id));
  }
  return ids;
}

async function ensureProductTags(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: existing } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
    filters: { value: DEMO_TAGS },
  });
  const ids = new Map(existing.map((t) => [t.value, t.id]));

  const missing = DEMO_TAGS.filter((v) => !ids.has(v));
  if (missing.length) {
    const { result } = await createProductTagsWorkflow(container).run({
      input: { product_tags: missing.map((value) => ({ value })) },
    });
    result.forEach((t) => ids.set(t.value, t.id));
  }
  return ids;
}

type SharedOption = { id: string; valueIds: Map<string, string> };

/**
 * Creates the shared Colour and Size options if missing, adds any values the
 * data file introduced, and keeps each colour's `hex` metadata in sync. Values
 * already on the option are passed back unchanged, which the product module
 * treats as "keep" (it only removes values that are left out).
 */
async function ensureSharedOptions(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const ensure = async (
    title: string,
    values: string[],
  ): Promise<SharedOption> => {
    const {
      data: [existing],
    } = await query.graph({
      entity: "product_option",
      fields: ["id", "values.id", "values.value"],
      filters: { title, is_exclusive: false },
    });

    const ranks = Object.fromEntries(values.map((v, i) => [v, i]));

    if (!existing) {
      await createProductOptionsWorkflow(container).run({
        input: {
          product_options: [{ title, values, ranks, is_exclusive: false }],
        },
      });
    } else {
      const known = new Set((existing.values ?? []).map((v) => v!.value));
      const missing = values.filter((v) => !known.has(v));
      if (missing.length) {
        await updateProductOptionsWorkflow(container).run({
          input: {
            selector: { id: existing.id },
            update: { values: [...known, ...missing] },
          },
        });
      }
    }

    const {
      data: [option],
    } = await query.graph({
      entity: "product_option",
      fields: ["id", "values.id", "values.value", "values.metadata"],
      filters: { title, is_exclusive: false },
    });
    return {
      id: option.id,
      valueIds: new Map(
        (option.values ?? []).map((v) => [v!.value, v!.id] as const),
      ),
    };
  };

  const colour = await ensure(
    COLOUR_OPTION,
    DEMO_COLOURS.map((c) => c.name),
  );
  const size = await ensure(SIZE_OPTION, SIZE_ORDER);

  const { data: colourValues } = await query.graph({
    entity: "product_option_value",
    fields: ["id", "value", "metadata"],
    filters: { option_id: colour.id },
  });
  for (const value of colourValues) {
    const hex = DEMO_COLOURS.find((c) => c.name === value.value)?.hex;
    if (hex && value.metadata?.hex !== hex) {
      await updateProductOptionValuesWorkflow(container).run({
        input: {
          id: value.id,
          update: { metadata: { ...(value.metadata ?? {}), hex } },
        },
      });
    }
  }

  return { colour, size };
}

/**
 * Gives each colour its own photo where the data file has one image per
 * colour (colour N gets image N): the variant's images and thumbnail, which
 * the storefront shows when that colour is selected. Products with fewer
 * images than colours keep the shared gallery.
 */
async function assignColourImages(
  container: MedusaContainer,
  products: DemoProduct[],
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const eligible = products.filter(
    (p) => p.colours.length > 1 && p.images.length >= p.colours.length,
  );
  if (!eligible.length) {
    return;
  }

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "handle",
      "images.id",
      "images.url",
      "variants.id",
      "variants.options.value",
      "variants.options.option.title",
    ],
    filters: { handle: eligible.map((p) => p.handle) },
  });

  const thumbnails: { id: string; thumbnail: string }[] = [];

  for (const product of data) {
    const demo = eligible.find((p) => p.handle === product.handle)!;

    for (const [index, colour] of demo.colours.entries()) {
      const image = product.images?.find(
        (img) => img?.url === demo.images[index],
      );
      const variantIds = (product.variants ?? [])
        .filter((variant) =>
          variant?.options?.some(
            (o) =>
              o?.option?.title === COLOUR_OPTION && o.value === colour.name,
          ),
        )
        .map((variant) => variant!.id);

      if (!image || !variantIds.length) {
        continue;
      }

      await batchImageVariantsWorkflow(container).run({
        input: { image_id: image.id, add: variantIds },
      });
      thumbnails.push(
        ...variantIds.map((id) => ({ id, thumbnail: image.url })),
      );
    }
  }

  if (thumbnails.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: thumbnails },
    });
  }
}

/** Deletes the demo products (with their variants and stock) and the sale. */
async function resetDemoCatalog(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { handle: DEMO_PRODUCTS.map((p) => p.handle) },
  });
  if (products.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: products.map((p) => p.id) },
    });
  }

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: ["id"],
    filters: { title: DEMO_PRICE_LISTS.map((l) => l.title) },
  });
  if (priceLists.length) {
    await deletePriceListsWorkflow(container).run({
      input: { ids: priceLists.map((l) => l.id) },
    });
  }

  logger.info(
    `Reset: deleted ${products.length} demo products and ${priceLists.length} price lists.`,
  );
}

function buildVariants(product: DemoProduct) {
  return product.colours.flatMap((colour) =>
    product.sizes.map((size) => ({
      title: `${colour.name} / ${size}`,
      sku: variantSku(product, colour.name, size),
      manage_inventory: true,
      options: { [COLOUR_OPTION]: colour.name, [SIZE_OPTION]: size },
      prices: [
        { currency_code: "ngn", amount: toNgn(product.priceUsd) },
        { currency_code: "usd", amount: product.priceUsd },
      ],
    })),
  );
}

async function stockNewProducts(
  container: MedusaContainer,
  stockLocationId: string,
  products: DemoProduct[],
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const soldOutHandles = new Set(
    products.filter((p) => p.soldOut).map((p) => p.handle),
  );

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "handle",
      "variants.sku",
      "variants.inventory_items.inventory_item_id",
    ],
    filters: { handle: products.map((p) => p.handle) },
  });

  const inventoryLevels = data.flatMap((product) =>
    (product.variants ?? []).flatMap((variant) =>
      (variant?.inventory_items ?? []).map((item) => ({
        location_id: stockLocationId,
        inventory_item_id: item!.inventory_item_id,
        stocked_quantity: soldOutHandles.has(product.handle)
          ? 0
          : demoStockFor(variant!.sku ?? ""),
      })),
    ),
  );

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  });
}

async function ensurePriceLists(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "price_list",
    fields: ["title"],
    filters: { title: DEMO_PRICE_LISTS.map((l) => l.title) },
  });
  const existingTitles = new Set(existing.map((l) => l.title));

  for (const list of DEMO_PRICE_LISTS) {
    if (existingTitles.has(list.title)) {
      logger.info(`Price list "${list.title}" already exists; skipping.`);
      continue;
    }

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["handle", "variants.id"],
      filters: { handle: list.productHandles },
    });
    const factor = 1 - list.discountPercent / 100;

    const prices = products.flatMap((product) => {
      const demo = DEMO_PRODUCTS.find((p) => p.handle === product.handle)!;
      return (product.variants ?? []).flatMap((variant) => [
        {
          variant_id: variant!.id,
          currency_code: "ngn",
          amount: roundTo(toNgn(demo.priceUsd) * factor, 500),
        },
        {
          variant_id: variant!.id,
          currency_code: "usd",
          amount: Math.round(demo.priceUsd * factor),
        },
      ]);
    });

    await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: list.title,
            description: list.description,
            // Price lists default to type "sale", which is what makes the
            // storefront receive an original_amount to strike through.
            status: PriceListStatus.ACTIVE,
            prices,
          },
        ],
      },
    });
    logger.info(
      `Created price list "${list.title}" (${list.discountPercent}% off ${products.length} products).`,
    );
  }
}

function variantSku(product: DemoProduct, colour: string, size: string) {
  const colourCode = colour
    .replace(/[^a-z]/gi, "")
    .slice(0, 3)
    .toUpperCase();
  const sizeCode = size.replace(/\s+/g, "").toUpperCase();
  return `YJ-${product.skuPrefix}-${colourCode}-${sizeCode}`;
}

function toNgn(usd: number) {
  return roundTo(usd * NGN_PER_USD, 500);
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

/**
 * Deterministic per-SKU stock so re-seeding a fresh database gives the same
 * shape: ~8% of variants sold out, ~10% low stock (1-3), the rest 5-39.
 */
function demoStockFor(sku: string) {
  let hash = 2166136261;
  for (const char of sku) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  const bucket = hash % 100;
  if (bucket < 8) {
    return 0;
  }
  if (bucket < 18) {
    return 1 + (hash % 3);
  }
  return 5 + (hash % 35);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
