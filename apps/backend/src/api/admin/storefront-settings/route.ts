import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { AdminUpdateStorefrontSettingsType } from "../../middlewares";
import { STOREFRONT_SETTINGS_MODULE } from "../../../modules/storefront-settings";
import type StorefrontSettingsModuleService from "../../../modules/storefront-settings/service";
import { updateStorefrontSettingsWorkflow } from "../../../workflows/update-storefront-settings";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );

  res.json({ settings: await service.retrieveSettings() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateStorefrontSettingsType>,
  res: MedusaResponse,
) => {
  const { result } = await updateStorefrontSettingsWorkflow(req.scope).run({
    input: { ...req.validatedBody, actor_id: req.auth_context.actor_id },
  });

  res.json({ settings: result });
};
