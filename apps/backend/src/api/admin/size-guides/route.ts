import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { AdminCreateSizeGuideType } from "../../middlewares";
import { createSizeGuideWorkflow } from "../../../workflows/size-guides";
import { listAdminSizeGuides } from "./helpers";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  res.json({ size_guides: await listAdminSizeGuides(req.scope) });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateSizeGuideType>,
  res: MedusaResponse,
) => {
  const { result } = await createSizeGuideWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  const [sizeGuide] = await listAdminSizeGuides(req.scope, { id: result.id });

  res.json({ size_guide: sizeGuide });
};
