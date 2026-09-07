import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { AdminUpdateBrandingType } from "../../middlewares";
import { BRANDING_MODULE } from "../../../modules/branding";
import type BrandingModuleService from "../../../modules/branding/service";
import { updateBrandingWorkflow } from "../../../workflows/update-branding";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: BrandingModuleService = req.scope.resolve(BRANDING_MODULE);

  res.json({ branding: await service.retrieveSettings() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateBrandingType>,
  res: MedusaResponse,
) => {
  const { result } = await updateBrandingWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  res.json({ branding: result });
};
