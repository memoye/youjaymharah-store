import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type RetrieveProductMetadataInput = { product_id: string };

/** A product's current metadata, so one key can change without losing the rest. */
export const retrieveProductMetadataStep = createStep(
  "retrieve-product-metadata",
  async (input: RetrieveProductMetadataInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id: input.product_id },
    });

    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ${input.product_id} was not found.`,
      );
    }

    return new StepResponse({
      id: product.id,
      metadata: (product.metadata as Record<string, unknown> | null) ?? {},
    });
  },
);
