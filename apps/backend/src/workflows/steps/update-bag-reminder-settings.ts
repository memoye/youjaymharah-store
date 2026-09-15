import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { BAG_REMINDER_MODULE } from "../../modules/bag-reminder";
import type BagReminderModuleService from "../../modules/bag-reminder/service";
import { BAG_REMINDER_SETTINGS_ID } from "../../modules/bag-reminder/service";

export type UpdateBagReminderSettingsInput = {
  enabled?: boolean;
  first_delay_hours?: number;
  second_delay_hours?: number | null;
  third_delay_hours?: number | null;
};

export const updateBagReminderSettingsStep = createStep(
  "update-bag-reminder-settings",
  async (input: UpdateBagReminderSettingsInput, { container }) => {
    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    // Reads through retrieveSettings so the row exists before the first edit.
    const previous = await service.retrieveSettings();

    // Checked against the stored values, so changing one delay can't leave
    // the three out of order.
    const merged = { ...previous, ...input };

    if (
      merged.second_delay_hours !== null &&
      merged.second_delay_hours <= merged.first_delay_hours
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The second reminder has to come after the first.",
      );
    }

    if (
      merged.third_delay_hours !== null &&
      (merged.second_delay_hours === null ||
        merged.third_delay_hours <= merged.second_delay_hours)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The third reminder needs a second reminder, and has to come after it.",
      );
    }

    const [updated] = await service.updateBagReminderSettings([
      { id: BAG_REMINDER_SETTINGS_ID, ...input },
    ]);

    return new StepResponse(updated, {
      enabled: previous.enabled,
      first_delay_hours: previous.first_delay_hours,
      second_delay_hours: previous.second_delay_hours,
      third_delay_hours: previous.third_delay_hours,
    });
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: BagReminderModuleService =
      container.resolve(BAG_REMINDER_MODULE);

    await service.updateBagReminderSettings([
      { id: BAG_REMINDER_SETTINGS_ID, ...previous },
    ]);
  },
);
