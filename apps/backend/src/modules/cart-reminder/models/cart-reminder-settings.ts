import { model } from "@medusajs/framework/utils";

/**
 * Cart reminder configuration. A singleton like the other settings modules,
 * edited under Settings -> Bag reminders. Off until staff turn it on, so no
 * shopper is emailed before the store is ready.
 *
 * Delays count from the cart's last change. A later reminder is turned off by
 * clearing its delay.
 */
export const CartReminderSettings = model.define("cart_reminder_settings", {
  id: model.id().primaryKey(),
  enabled: model.boolean().default(false),
  first_delay_hours: model.number().default(1),
  second_delay_hours: model.number().nullable(),
  third_delay_hours: model.number().nullable(),
});
