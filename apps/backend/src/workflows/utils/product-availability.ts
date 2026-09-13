import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  ProductStatus,
} from "@medusajs/framework/utils";

/**
 * The product metadata key behind "coming soon". Set it through
 * POST /admin/products/:id/coming-soon (the product page widget), which keeps
 * the value a real boolean: a string "true" typed into the metadata editor
 * does not count.
 */
export const COMING_SOON_METADATA_KEY = "coming_soon";

/**
 * When a coming-soon product was launched (ISO 8601), stamped by
 * setProductComingSoonWorkflow. The storefront's "New" badge counts from
 * here, falling back to the product's `created_at`: Medusa has no publish
 * date, and a product created weeks before launch would otherwise be "old" on
 * the day it goes on sale.
 */
export const LAUNCHED_AT_METADATA_KEY = "launched_at";

export function isComingSoon(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.[COMING_SOON_METADATA_KEY] === true;
}

export type AlertProduct = {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  variants: {
    id: string;
    title: string | null;
    manage_inventory: boolean;
    allow_backorder: boolean;
  }[];
};

/** Products by id, with just what alert decisions and emails need. */
export async function retrieveAlertProducts(
  container: MedusaContainer,
  productIds: string[],
): Promise<Map<string, AlertProduct>> {
  const products = new Map<string, AlertProduct>();

  if (!productIds.length) {
    return products;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "status",
      "metadata",
      "variants.id",
      "variants.title",
      "variants.manage_inventory",
      "variants.allow_backorder",
    ],
    filters: { id: productIds },
  });

  for (const product of data) {
    products.set(product.id, {
      id: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail ?? null,
      status: product.status,
      metadata: (product.metadata as Record<string, unknown> | null) ?? null,
      variants: (product.variants ?? []).flatMap((variant) =>
        variant
          ? [
              {
                id: variant.id,
                title: variant.title ?? null,
                manage_inventory: Boolean(variant.manage_inventory),
                allow_backorder: Boolean(variant.allow_backorder),
              },
            ]
          : [],
      ),
    });
  }

  return products;
}

/**
 * The variants a shopper could add to their bag right now, in one sales
 * channel: the product is published and not coming soon, and the variant
 * either does not track stock, allows backorders, or has stock (stocked minus
 * reserved) at one of the channel's locations.
 */
export async function findPurchasableVariantIds(
  container: MedusaContainer,
  products: AlertProduct[],
  salesChannelId: string,
): Promise<Set<string>> {
  const purchasable = new Set<string>();
  const tracked: string[] = [];

  for (const product of products) {
    if (
      product.status !== ProductStatus.PUBLISHED ||
      isComingSoon(product.metadata)
    ) {
      continue;
    }

    for (const variant of product.variants) {
      if (!variant.manage_inventory || variant.allow_backorder) {
        purchasable.add(variant.id);
      } else {
        tracked.push(variant.id);
      }
    }
  }

  if (tracked.length) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const availability = await getVariantAvailability(query, {
      variant_ids: tracked,
      sales_channel_id: salesChannelId,
    });

    for (const variantId of tracked) {
      if ((availability[variantId]?.availability ?? 0) > 0) {
        purchasable.add(variantId);
      }
    }
  }

  return purchasable;
}

/** An alert for a size waits on that size; one without waits on any size. */
export function isAlertDue(
  alert: { variant_id: string | null },
  product: AlertProduct,
  purchasable: Set<string>,
): boolean {
  return alert.variant_id
    ? purchasable.has(alert.variant_id)
    : product.variants.some((variant) => purchasable.has(variant.id));
}
