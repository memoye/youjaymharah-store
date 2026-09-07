import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BRANDING_MODULE } from "../../modules/branding";
import BrandingModuleService, {
  BRANDING_ID,
} from "../../modules/branding/service";

export type UpdateBrandingStepInput = {
  name?: string;
  logo_url?: string | null;
  support_email?: string | null;
};

export const updateBrandingStep = createStep(
  "update-branding",
  async (input: UpdateBrandingStepInput, { container }) => {
    const service: BrandingModuleService = container.resolve(BRANDING_MODULE);

    // Reads through retrieveSettings so the row exists before the first edit.
    const previous = await service.retrieveSettings();

    const [updated] = await service.updateBrandings([
      { id: BRANDING_ID, ...input },
    ]);

    return new StepResponse(updated, {
      name: previous.name,
      logo_url: previous.logo_url,
      support_email: previous.support_email,
    });
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: BrandingModuleService = container.resolve(BRANDING_MODULE);

    await service.updateBrandings([{ id: BRANDING_ID, ...previous }]);
  },
);
