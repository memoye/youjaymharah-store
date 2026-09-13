import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { STOREFRONT_SETTINGS_MODULE } from "../../modules/storefront-settings";
import StorefrontSettingsModuleService, {
  STOREFRONT_SETTINGS_ID,
} from "../../modules/storefront-settings/service";

export type UpdateStorefrontSettingsInput = {
  new_badge_days?: number;
};

export const updateStorefrontSettingsStep = createStep(
  "update-storefront-settings",
  async (input: UpdateStorefrontSettingsInput, { container }) => {
    const service: StorefrontSettingsModuleService = container.resolve(
      STOREFRONT_SETTINGS_MODULE,
    );

    // Reads through retrieveSettings so the row exists before the first edit.
    const previous = await service.retrieveSettings();

    const [updated] = await service.updateStorefrontSettings([
      { id: STOREFRONT_SETTINGS_ID, ...input },
    ]);

    return new StepResponse(updated, {
      new_badge_days: previous.new_badge_days,
    });
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: StorefrontSettingsModuleService = container.resolve(
      STOREFRONT_SETTINGS_MODULE,
    );

    await service.updateStorefrontSettings([
      { id: STOREFRONT_SETTINGS_ID, ...previous },
    ]);
  },
);
