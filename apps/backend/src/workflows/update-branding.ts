import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { notifyStorefrontStep } from "./steps/notify-storefront";
import {
  updateBrandingStep,
  type UpdateBrandingStepInput,
} from "./steps/update-branding";

export const updateBrandingWorkflow = createWorkflow(
  "update-branding",
  function (input: UpdateBrandingStepInput) {
    const branding = updateBrandingStep(input);

    // The storefront's public settings include the brand (name, logo, favicon).
    notifyStorefrontStep({ tags: ["storefront-settings"] });

    return new WorkflowResponse(branding);
  },
);
