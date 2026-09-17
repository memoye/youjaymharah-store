import { MedusaService } from "@medusajs/framework/utils";

import { CartReminder } from "./models/cart-reminder";
import { CartReminderOptOut } from "./models/cart-reminder-opt-out";
import { CartReminderSettings } from "./models/cart-reminder-settings";

/** The single row every cart reminder settings read and write addresses. */
export const CART_REMINDER_SETTINGS_ID = "cart_reminder_settings_default";

/** 1 hour, 24 hours and 1 week after the cart's last change. */
export const DEFAULT_DELAYS_HOURS = {
  first_delay_hours: 1,
  second_delay_hours: 24,
  third_delay_hours: 168,
} as const;

class CartReminderModuleService extends MedusaService({
  CartReminder,
  CartReminderOptOut,
  CartReminderSettings,
}) {
  /**
   * Returns the settings, creating them on first access with reminders off
   * and the default delays.
   */
  async retrieveSettings() {
    const [existing] = await this.listCartReminderSettings({
      id: CART_REMINDER_SETTINGS_ID,
    });

    if (existing) {
      return existing;
    }

    const [created] = await this.createCartReminderSettings([
      {
        id: CART_REMINDER_SETTINGS_ID,
        enabled: false,
        ...DEFAULT_DELAYS_HOURS,
      },
    ]);

    return created;
  }
}

export default CartReminderModuleService;
