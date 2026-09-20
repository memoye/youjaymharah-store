import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import type { StoreMenuPromoType } from "../../api/middlewares";

export type ValidateStoreMenuPromosInput = {
  store_menu_cards?: StoreMenuPromoType[];
};

const entityForTarget = {
  collection: "product_collection",
  category: "product_category",
  product: "product",
} as const;

/** Refuses stale or hand-crafted promo targets before settings are saved. */
export const validateStoreMenuPromosStep = createStep(
  "validate-store-menu-promos",
  async (input: ValidateStoreMenuPromosInput, { container }) => {
    if (!input.store_menu_cards) {
      return new StepResponse(undefined);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    await Promise.all(
      input.store_menu_cards.map(async (promo) => {
        const { data } = await query.graph({
          entity: entityForTarget[promo.target_type],
          fields: ["id"],
          filters: { id: promo.target_id },
        });

        if (!data.length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `The selected ${promo.target_type} no longer exists. Choose another destination.`,
          );
        }
      }),
    );

    return new StepResponse(undefined);
  },
);
