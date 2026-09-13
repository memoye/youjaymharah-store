import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { STOREFRONT_SETTINGS_MODULE } from "../../../modules/storefront-settings";
import type StorefrontSettingsModuleService from "../../../modules/storefront-settings/service";

/**
 * The settings the storefront renders with. Public and the same for every
 * shopper, so storefront pages can read it and stay cached. Lists fields
 * explicitly, so a setting added later is not exposed by accident.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );

  const settings = await service.retrieveSettings();

  res.json({ settings: { new_badge_days: settings.new_badge_days } });
};
