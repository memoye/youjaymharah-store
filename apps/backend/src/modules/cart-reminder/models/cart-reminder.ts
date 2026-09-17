import { model } from "@medusajs/framework/utils";

/**
 * Reminder progress for one abandoned cart (the shopper's "shopping bag"). Created
 * when the first reminder is sent, so carts nobody is reminded about leave no
 * trace here.
 *
 * `token` backs both links in the email: restoring the cart and stopping
 * reminders. It is the only credential those links carry.
 */
export const CartReminder = model
  .define("cart_reminder", {
    id: model.id({ prefix: "cartrem" }).primaryKey(),
    cart_id: model.text(),
    /** The cart's email, lowercased, at the time of the first reminder. */
    email: model.text(),
    customer_id: model.text().nullable(),
    token: model.text(),
    /** How many reminders have gone out for this cart. */
    reminders_sent: model.number().default(0),
    // active: more reminders may follow. finished: all sent, or too late.
    // recovered: an order was placed from the cart after a reminder.
    // stopped: the shopper used the stop link. failed: Resend kept refusing.
    status: model
      .enum(["active", "finished", "recovered", "stopped", "failed"])
      .default("active"),
    failed_attempts: model.number().default(0),
    last_sent_at: model.dateTime().nullable(),
    /** First time the shopper opened the cart from a reminder. */
    restored_at: model.dateTime().nullable(),
    recovered_at: model.dateTime().nullable(),
    order_id: model.text().nullable(),
  })
  .indexes([
    { on: ["cart_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["token"], unique: true, where: "deleted_at IS NULL" },
    { on: ["email"] },
  ]);
