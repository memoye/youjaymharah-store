import { model } from "@medusajs/framework/utils";

/**
 * An address that asked for no more bag reminders, from the stop link in a
 * reminder email. Applies to every bag with that address, now and later.
 */
export const BagReminderOptOut = model
  .define("bag_reminder_opt_out", {
    id: model.id({ prefix: "bagopt" }).primaryKey(),
    /** Lowercased. */
    email: model.text(),
  })
  .indexes([{ on: ["email"], unique: true, where: "deleted_at IS NULL" }]);
