import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, ProductStatus } from "@medusajs/framework/utils";
import {
  resolveProductSizeGuide,
  toStoreSizeGuide,
} from "../../../../../workflows/utils/size-guide";

/**
 * The size guide a product page shows: the product's own, else the nearest
 * category's, else the store default. `size_guide` is null when none applies;
 * hide the "Size guide" link then. Reads no customer data, so it is safe to
 * call from cached catalogue pages.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const resolved = await resolveProductSizeGuide(req.scope, req.params.id);

  if (resolved.product?.status !== ProductStatus.PUBLISHED) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product ${req.params.id} was not found.`,
    );
  }

  res.json({
    size_guide: resolved.size_guide
      ? toStoreSizeGuide(resolved.size_guide)
      : null,
    source: resolved.source,
  });
};
