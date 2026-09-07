import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import {
  updateBrandingStep,
  type UpdateBrandingStepInput,
} from "./steps/update-branding";

export const updateBrandingWorkflow = createWorkflow(
  "update-branding",
  function (input: UpdateBrandingStepInput) {
    const branding = updateBrandingStep(input);

    return new WorkflowResponse(branding);
  },
);
