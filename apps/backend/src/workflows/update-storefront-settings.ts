import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { notifyStorefrontStep } from "./steps/notify-storefront";
import { recordHomepageHeroRevisionStep } from "./steps/record-homepage-hero-revision";
import {
  updateStorefrontSettingsStep,
  type UpdateStorefrontSettingsInput,
} from "./steps/update-storefront-settings";
import { validateFeaturedCollectionStep } from "./steps/validate-featured-collection";

export type UpdateStorefrontSettingsWorkflowInput =
  UpdateStorefrontSettingsInput & {
    /** The admin user saving, recorded against a replaced hero. */
    actor_id?: string | null;
  };

export const updateStorefrontSettingsWorkflow = createWorkflow(
  "update-storefront-settings",
  function (input: UpdateStorefrontSettingsWorkflowInput) {
    const featured = transform({ input }, ({ input }) => ({
      featured_collection_id: input.featured_collection_id,
    }));

    validateFeaturedCollectionStep(featured);

    const revision = transform({ input }, ({ input }) => ({
      homepage_hero: input.homepage_hero,
      replaced_by: input.actor_id ?? null,
    }));

    // Before the update, while the hero being replaced is still stored.
    recordHomepageHeroRevisionStep(revision);

    const changes = transform(
      { input },
      ({ input }): UpdateStorefrontSettingsInput =>
        Object.fromEntries(
          Object.entries(input).filter(([key]) => key !== "actor_id"),
        ),
    );

    const settings = updateStorefrontSettingsStep(changes);

    // One tag for everything in storefront settings, the home page included.
    notifyStorefrontStep({ tags: ["storefront-settings"] });

    return new WorkflowResponse(settings);
  },
);
