import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { notifyStorefrontStep } from "./steps/notify-storefront";
import {
  updateStorefrontSettingsStep,
  type UpdateStorefrontSettingsInput,
} from "./steps/update-storefront-settings";

export const updateStorefrontSettingsWorkflow = createWorkflow(
  "update-storefront-settings",
  function (input: UpdateStorefrontSettingsInput) {
    const settings = updateStorefrontSettingsStep(input);

    notifyStorefrontStep({ tags: ["storefront-settings"] });

    return new WorkflowResponse(settings);
  },
);
