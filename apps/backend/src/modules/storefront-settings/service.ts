import { MedusaService } from "@medusajs/framework/utils";

import { StorefrontSettings } from "./models/storefront-settings";

/** The single row every storefront settings read and write addresses. */
export const STOREFRONT_SETTINGS_ID = "storefront_settings_default";

export const DEFAULT_NEW_BADGE_DAYS = 30;

class StorefrontSettingsModuleService extends MedusaService({
  StorefrontSettings,
}) {
  /**
   * Returns the settings, creating them with defaults on first access, so the
   * storefront and the admin page never see an empty state.
   */
  async retrieveSettings() {
    const [existing] = await this.listStorefrontSettings({
      id: STOREFRONT_SETTINGS_ID,
    });

    if (existing) {
      return existing;
    }

    const [created] = await this.createStorefrontSettings([
      { id: STOREFRONT_SETTINGS_ID, new_badge_days: DEFAULT_NEW_BADGE_DAYS },
    ]);

    return created;
  }
}

export default StorefrontSettingsModuleService;
