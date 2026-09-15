import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type ValidateFeaturedCollectionInput = {
  /** Undefined leaves the setting alone and null clears it; neither is checked. */
  featured_collection_id?: string | null;
};

/** Refuses to feature a collection that doesn't exist, so a typo can't save. */
export const validateFeaturedCollectionStep = createStep(
  "validate-featured-collection",
  async (input: ValidateFeaturedCollectionInput, { container }) => {
    const id = input.featured_collection_id;

    if (!id) {
      return new StepResponse(undefined);
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "product_collection",
      fields: ["id"],
      filters: { id },
    });

    if (!data.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Collection ${id} doesn't exist, so it can't be featured on the home page.`,
      );
    }

    return new StepResponse(undefined);
  },
);
