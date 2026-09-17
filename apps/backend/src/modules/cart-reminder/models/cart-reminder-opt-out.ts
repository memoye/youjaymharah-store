import { model } from "@medusajs/framework/utils";

/**
 * An address that asked for no more cart reminders, from the stop link in a
 * reminder email. Applies to every cart with that address, now and later.
 */
export const CartReminderOptOut = model
  .define("cart_reminder_opt_out", {
    id: model.id({ prefix: "cartopt" }).primaryKey(),
    /** Lowercased. */
    email: model.text(),
  })
  .indexes([{ on: ["email"], unique: true, where: "deleted_at IS NULL" }]);
