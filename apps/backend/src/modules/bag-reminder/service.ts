import { MedusaService } from "@medusajs/framework/utils";

import { BagReminder } from "./models/bag-reminder";
import { BagReminderOptOut } from "./models/bag-reminder-opt-out";
import { BagReminderSettings } from "./models/bag-reminder-settings";

/** The single row every bag reminder settings read and write addresses. */
export const BAG_REMINDER_SETTINGS_ID = "bag_reminder_settings_default";

/** 1 hour, 24 hours and 1 week after the bag's last change. */
export const DEFAULT_DELAYS_HOURS = {
  first_delay_hours: 1,
  second_delay_hours: 24,
  third_delay_hours: 168,
} as const;

class BagReminderModuleService extends MedusaService({
  BagReminder,
  BagReminderOptOut,
  BagReminderSettings,
}) {
  /**
   * Returns the settings, creating them on first access with reminders off
   * and the default delays.
   */
  async retrieveSettings() {
    const [existing] = await this.listBagReminderSettings({
      id: BAG_REMINDER_SETTINGS_ID,
    });

    if (existing) {
      return existing;
    }

    const [created] = await this.createBagReminderSettings([
      { id: BAG_REMINDER_SETTINGS_ID, enabled: false, ...DEFAULT_DELAYS_HOURS },
    ]);

    return created;
  }
}

export default BagReminderModuleService;
