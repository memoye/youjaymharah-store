import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import type { AdminSetSizeGuideType } from "../../../../middlewares";
import { setProductSizeGuideWorkflow } from "../../../../../workflows/size-guides";
import { resolveProductSizeGuide } from "../../../../../workflows/utils/size-guide";

/**
 * The product's own guide (its override) and the guide it actually shows,
 * with where that comes from, so the product page can say "From the Dresses
 * category" when nothing is set on the product.
 */
async function describe(scope: MedusaContainer, productId: string) {
  const resolved = await resolveProductSizeGuide(scope, productId);

  if (!resolved.product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product ${productId} was not found.`,
    );
  }

  return {
    size_guide_id: resolved.own_size_guide_id,
    resolved: {
      size_guide: resolved.size_guide
        ? { id: resolved.size_guide.id, name: resolved.size_guide.name }
        : null,
      source: resolved.source,
      category: resolved.category,
    },
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
  await setProductSizeGuideWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      size_guide_id: req.validatedBody.size_guide_id,
    },
  });

  res.json(await describe(req.scope, req.params.id));
};
