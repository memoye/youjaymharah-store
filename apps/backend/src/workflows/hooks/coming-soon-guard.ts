import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  addToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { isComingSoon } from "../utils/product-availability";

/**
 * "Coming soon" products stay published so shoppers can find them and ask to
 * be notified, which also means the Store API would sell them. These hooks
 * refuse them when a cart is created with items, when an item is added, and
 * again at checkout, in case the flag was switched on while an item sat in a
 * cart. Staff can still add them to draft orders.
 */
async function refuseComingSoon(
  container: MedusaContainer,
  variantIds: (string | null | undefined)[],
): Promise<void> {
  const ids = [
    ...new Set(variantIds.filter((id): id is string => Boolean(id))),
  ];

  if (!ids.length) {
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.title", "product.metadata"],
    filters: { id: ids },
  });

  const blocked = variants.find((variant) =>
    isComingSoon(
      variant.product?.metadata as Record<string, unknown> | null | undefined,
    ),
  );

  if (blocked) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${blocked.product?.title ?? "This item"} is coming soon and can't be bought yet.`,
    );
  }
}

addToCartWorkflow.hooks.validate(async ({ input }, { container }) => {
  await refuseComingSoon(
    container,
    (input.items ?? []).map((item) => item.variant_id),
  );
});

createCartWorkflow.hooks.validate(async ({ input }, { container }) => {
  await refuseComingSoon(
    container,
    (input.items ?? []).map((item) => item.variant_id),
  );
});

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  await refuseComingSoon(
    container,
    (cart.items ?? []).map((item) => item?.variant_id),
  );
});
