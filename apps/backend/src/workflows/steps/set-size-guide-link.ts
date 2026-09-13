import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { SIZE_GUIDE_MODULE } from "../../modules/size-guide";
import type SizeGuideModuleService from "../../modules/size-guide/service";

export type SetSizeGuideLinkInput = {
  target: "product" | "product_category";
  id: string;
  /** null removes the guide, so the product or category inherits again. */
  size_guide_id: string | null;
};

type Compensation = {
  target: SetSizeGuideLinkInput["target"];
  id: string;
  previous: string | null;
  next: string | null;
} | null;

const LABEL = { product: "Product", product_category: "Category" } as const;

/**
 * Points a product or category at a size guide, replacing the one it had.
 * Both link definitions allow one guide per product or category, so the old
 * link is dismissed before the new one is created.
 */
export const setSizeGuideLinkStep = createStep(
  "set-size-guide-link",
  async (input: SetSizeGuideLinkInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [found],
    } = await query.graph({
      entity: input.target,
      fields: ["id", "size_guide.id"],
      filters: { id: input.id },
    });

    const entity = found as unknown as
      { id: string; size_guide?: { id: string } | null } | undefined;

    if (!entity) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `${LABEL[input.target]} ${input.id} was not found.`,
      );
    }

    if (input.size_guide_id) {
      const service: SizeGuideModuleService =
        container.resolve(SIZE_GUIDE_MODULE);
      const [guide] = await service.listSizeGuides({ id: input.size_guide_id });

      if (!guide) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Size guide ${input.size_guide_id} was not found.`,
        );
      }
    }

    const previous = entity.size_guide?.id ?? null;
    const next = input.size_guide_id;

    if (previous === next) {
      return new StepResponse({ size_guide_id: next }, null as Compensation);
    }

    await relink(container, input.target, input.id, previous, next);

    return new StepResponse({ size_guide_id: next }, {
      target: input.target,
      id: input.id,
      previous,
      next,
    } as Compensation);
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    await relink(
      container,
      compensation.target,
      compensation.id,
      compensation.next,
      compensation.previous,
    );
  },
);

async function relink(
  container: Parameters<Parameters<typeof createStep>[1]>[1]["container"],
  target: SetSizeGuideLinkInput["target"],
  id: string,
  from: string | null,
  to: string | null,
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  // Keys follow each defineLink in src/links: the product module side first.
  const owner =
    target === "product"
      ? { [Modules.PRODUCT]: { product_id: id } }
      : { [Modules.PRODUCT]: { product_category_id: id } };

  if (from) {
    await link.dismiss({
      ...owner,
      [SIZE_GUIDE_MODULE]: { size_guide_id: from },
    });
  }

  if (to) {
    await link.create({
      ...owner,
      [SIZE_GUIDE_MODULE]: { size_guide_id: to },
    });
  }
}
