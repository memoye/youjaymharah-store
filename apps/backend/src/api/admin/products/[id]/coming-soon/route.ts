import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { AdminSetProductComingSoonType } from "../../../../middlewares";
import { setProductComingSoonWorkflow } from "../../../../../workflows/product-alerts";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSetProductComingSoonType>,
  res: MedusaResponse,
) => {
  const { result } = await setProductComingSoonWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      coming_soon: req.validatedBody.coming_soon,
    },
  });

  res.json({ product: result });
};
