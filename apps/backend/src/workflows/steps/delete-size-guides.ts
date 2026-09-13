import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SIZE_GUIDE_MODULE } from "../../modules/size-guide";
import type SizeGuideModuleService from "../../modules/size-guide/service";

export type DeleteSizeGuidesInput = { ids: string[] };

export const deleteSizeGuidesStep = createStep(
  "delete-size-guides",
  async (input: DeleteSizeGuidesInput, { container }) => {
    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    if (input.ids.length) {
      await service.softDeleteSizeGuides(input.ids);
    }

    return new StepResponse({ ids: input.ids }, input.ids);
  },
  async (ids, { container }) => {
    if (!ids?.length) {
      return;
    }

    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    await service.restoreSizeGuides(ids);
  },
);
