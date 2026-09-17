import { Module } from "@medusajs/framework/utils";

import CartReminderModuleService from "./service";

export const CART_REMINDER_MODULE = "cartReminder";

export default Module(CART_REMINDER_MODULE, {
  service: CartReminderModuleService,
});
