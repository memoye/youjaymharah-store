import { Module } from "@medusajs/framework/utils";

import BagReminderModuleService from "./service";

export const BAG_REMINDER_MODULE = "bagReminder";

export default Module(BAG_REMINDER_MODULE, {
  service: BagReminderModuleService,
});
