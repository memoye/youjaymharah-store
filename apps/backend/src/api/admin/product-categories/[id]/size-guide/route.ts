import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import type { AdminSetSizeGuideType } from "../../../../middlewares";
import { setCategorySizeGuideWorkflow } from "../../../../../workflows/size-guides";
import { findCategorySizeGuide } from "../../../../../workflows/utils/size-guide";

/**
 * The category's own guide, and the one it inherits from a parent category
 * when it has none, so the category page can say what its products get.
 */
async function describe(scope: MedusaContainer, categoryId: string) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [found],
  } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "mpath", "size_guide.id"],
    filters: { id: categoryId },
  });

  const category = found as unknown as
    | {
        id: string;
        name: string;
        mpath: string | null;
        size_guide?: { id: string } | null;
      }
    | undefined;

  if (!category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Category ${categoryId} was not found.`,
    );
  }

  const inherited = await findCategorySizeGuide(scope, [category], {
    excludeSelf: true,
  });

  return {
    size_guide_id: category.size_guide?.id ?? null,
    inherited: inherited
      ? {
          size_guide: {
            id: inherited.size_guide.id,
            name: inherited.size_guide.name,
          },
          category: inherited.category,
        }
      : null,
  };
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  res.json(await describe(req.scope, req.params.id));
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSetSizeGuideType>,
  res: MedusaResponse,
) => {
  await setCategorySizeGuideWorkflow(req.scope).run({
    input: {
      category_id: req.params.id,
      size_guide_id: req.validatedBody.size_guide_id,
    },
  });

  res.json(await describe(req.scope, req.params.id));
};
