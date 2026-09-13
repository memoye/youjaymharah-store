import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  updateStorefrontSettingsStep,
  type UpdateStorefrontSettingsInput,
} from "./steps/update-storefront-settings";

export const updateStorefrontSettingsWorkflow = createWorkflow(
  "update-storefront-settings",
  function (input: UpdateStorefrontSettingsInput) {
    const settings = updateStorefrontSettingsStep(input);

    return new WorkflowResponse(settings);
  },
);
