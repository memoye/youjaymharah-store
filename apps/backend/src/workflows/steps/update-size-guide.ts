import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SIZE_GUIDE_MODULE } from "../../modules/size-guide";
import type SizeGuideModuleService from "../../modules/size-guide/service";
import type { SizeGuideTable } from "../../modules/size-guide/types";
import { unsetDefaultSizeGuides } from "../utils/size-guide";

export type UpdateSizeGuideInput = {
  id: string;
  name?: string;
  description?: string | null;
  diagram_url?: string | null;
  table?: SizeGuideTable;
  is_default?: boolean;
};

type Snapshot = {
  id: string;
  name: string;
  description: string | null;
  diagram_url: string | null;
  table: Record<string, unknown>;
  is_default: boolean;
};

/** Updates only the fields given. Making a guide the default unsets the old one. */
export const updateSizeGuideStep = createStep(
  "update-size-guide",
  async (input: UpdateSizeGuideInput, { container }) => {
    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    const [existing] = await service.listSizeGuides({ id: input.id });

    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Size guide ${input.id} was not found.`,
      );
    }

    const previous: Snapshot = {
      id: existing.id,
      name: existing.name,
      description: existing.description,
      diagram_url: existing.diagram_url,
      table: existing.table as Record<string, unknown>,
      is_default: existing.is_default,
    };

    const unsetDefaults =
      input.is_default === true
        ? await unsetDefaultSizeGuides(service, input.id)
        : [];

    await service.updateSizeGuides({
      id: input.id,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.diagram_url !== undefined
        ? { diagram_url: input.diagram_url }
        : {}),
      ...(input.table !== undefined
        ? { table: input.table as unknown as Record<string, unknown> }
        : {}),
      ...(input.is_default !== undefined
        ? { is_default: input.is_default }
        : {}),
    });

    return new StepResponse(
      { id: input.id },
      { previous, unset_defaults: unsetDefaults },
    );
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: SizeGuideModuleService =
      container.resolve(SIZE_GUIDE_MODULE);

    // This guide first, so it gives up the default before the old one takes it back.
    await service.updateSizeGuides(compensation.previous);

    if (compensation.unset_defaults.length) {
      await service.updateSizeGuides(
        compensation.unset_defaults.map((id) => ({ id, is_default: true })),
      );
    }
  },
);
