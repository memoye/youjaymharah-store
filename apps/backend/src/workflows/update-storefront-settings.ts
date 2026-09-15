import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { notifyStorefrontStep } from "./steps/notify-storefront";
import {
  updateStorefrontSettingsStep,
  type UpdateStorefrontSettingsInput,
} from "./steps/update-storefront-settings";
import { validateFeaturedCollectionStep } from "./steps/validate-featured-collection";

export const updateStorefrontSettingsWorkflow = createWorkflow(
  "update-storefront-settings",
  function (input: UpdateStorefrontSettingsInput) {
    const featured = transform({ input }, ({ input }) => ({
      featured_collection_id: input.featured_collection_id,
    }));

    validateFeaturedCollectionStep(featured);

    const settings = updateStorefrontSettingsStep(input);

    // One tag for everything in storefront settings, the home page included.
    notifyStorefrontStep({ tags: ["storefront-settings"] });

    return new WorkflowResponse(settings);
  },
);
