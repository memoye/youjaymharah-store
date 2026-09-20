import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http";
import { STOREFRONT_SETTINGS_MODULE } from "../../../modules/storefront-settings";
import type StorefrontSettingsModuleService from "../../../modules/storefront-settings/service";
import { resolveAnnouncements } from "../../../modules/storefront-settings/announcement-resolver";

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const service: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );
  const settings = await service.retrieveSettings();
  const result = await resolveAnnouncements(
    req.scope,
    settings.announcement_bar,
    req.publishable_key_context.sales_channel_ids,
  );
  res.setHeader("Cache-Control", "no-store");
  res.json(result);
};
