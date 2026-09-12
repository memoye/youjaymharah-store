import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type ValidateWishlistProductInput = {
  product_id: string;
  product_variant_id?: string | null;
};

/**
 * Only published products can be saved, and a variant must belong to the
 * product it is saved under -- the IDs come straight from the storefront.
 */
export const validateWishlistProductStep = createStep(
  "validate-wishlist-product",
  async (input: ValidateWishlistProductInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: ["id", "status", "variants.id"],
      filters: { id: input.product_id },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ${input.product_id} was not found.`,
      );
    }

    if (
      input.product_variant_id &&
      !product.variants?.some((v) => v?.id === input.product_variant_id)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${input.product_variant_id} does not belong to product ${input.product_id}.`,
      );
    }

    return new StepResponse(true);
  },
);
