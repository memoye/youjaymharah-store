import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { removeRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { SIZE_GUIDE_MODULE } from "../modules/size-guide";
import {
  createSizeGuideStep,
  type CreateSizeGuideInput,
} from "./steps/create-size-guide";
import {
  deleteSizeGuidesStep,
  type DeleteSizeGuidesInput,
} from "./steps/delete-size-guides";
import { setSizeGuideLinkStep } from "./steps/set-size-guide-link";
import {
  updateSizeGuideStep,
  type UpdateSizeGuideInput,
} from "./steps/update-size-guide";
import { validateSizeGuideTableStep } from "./steps/validate-size-guide-table";

export const createSizeGuideWorkflow = createWorkflow(
  "create-size-guide",
  function (input: CreateSizeGuideInput) {
    validateSizeGuideTableStep({ table: input.table });

    const guide = createSizeGuideStep(input);

    return new WorkflowResponse(guide);
  },
);

export const updateSizeGuideWorkflow = createWorkflow(
  "update-size-guide",
  function (input: UpdateSizeGuideInput) {
    validateSizeGuideTableStep({ table: input.table });

    const guide = updateSizeGuideStep(input);

    return new WorkflowResponse(guide);
  },
);

/**
 * Deletes guides and the links to them, so the products and categories that
 * used them fall back to their category's guide or the store default.
 */
export const deleteSizeGuidesWorkflow = createWorkflow(
  "delete-size-guides",
  function (input: DeleteSizeGuidesInput) {
    const deleted = deleteSizeGuidesStep(input);

    removeRemoteLinkStep({
      [SIZE_GUIDE_MODULE]: { size_guide_id: input.ids },
    });

    return new WorkflowResponse(deleted);
  },
);

export type SetProductSizeGuideInput = {
  product_id: string;
  size_guide_id: string | null;
};

export const setProductSizeGuideWorkflow = createWorkflow(
  "set-product-size-guide",
  function (input: SetProductSizeGuideInput) {
    const linkInput = transform({ input }, ({ input }) => ({
      target: "product" as const,
      id: input.product_id,
      size_guide_id: input.size_guide_id,
    }));

    const result = setSizeGuideLinkStep(linkInput);

    return new WorkflowResponse(result);
  },
);

export type SetCategorySizeGuideInput = {
  category_id: string;
  size_guide_id: string | null;
};

export const setCategorySizeGuideWorkflow = createWorkflow(
  "set-category-size-guide",
  function (input: SetCategorySizeGuideInput) {
    const linkInput = transform({ input }, ({ input }) => ({
      target: "product_category" as const,
      id: input.category_id,
      size_guide_id: input.size_guide_id,
    }));

    const result = setSizeGuideLinkStep(linkInput);

    return new WorkflowResponse(result);
  },
);
