import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SIZE_GUIDE_MODULE } from "../../modules/size-guide";
import type SizeGuideModuleService from "../../modules/size-guide/service";
import type { SizeGuideTable } from "../../modules/size-guide/types";
import { unsetDefaultSizeGuides } from "../utils/size-guide";

export type CreateSizeGuideInput = {
  name: string;
  description?: string | null;
  diagram_url?: string | null;
  table: SizeGuideTable;
  /** Makes this the store default, replacing the current one. */
  is_default?: boolean;
};

export const createSizeGuideStep = createStep(
  "create-size-guide",
  async (input: CreateSizeGuideInput, { container }) => {
    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    const unsetDefaults = input.is_default
      ? await unsetDefaultSizeGuides(service)
      : [];

    const created = await service.createSizeGuides({
      name: input.name,
      description: input.description ?? null,
      diagram_url: input.diagram_url ?? null,
      table: input.table as unknown as Record<string, unknown>,
      is_default: input.is_default ?? false,
    });

    return new StepResponse(
      { id: created.id },
      { created: created.id, unset_defaults: unsetDefaults },
    );
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    // Deleted first: two defaults at once would break the unique index.
    await service.deleteSizeGuides(compensation.created);

    if (compensation.unset_defaults.length) {
      await service.updateSizeGuides(
        compensation.unset_defaults.map((id) => ({ id, is_default: true })),
      );
    }
  },
);
