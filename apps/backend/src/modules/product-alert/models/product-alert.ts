import { model } from "@medusajs/framework/utils";

/**
 * A request to be emailed once a product can be bought: when a sold-out size
 * is restocked, or when a "coming soon" product launches. Sent once, then
 * done. Asking for an alert is not consent to marketing; that is recorded
 * separately by the newsletter module.
 */
export const ProductAlert = model
  .define("product_alert", {
    id: model.id({ prefix: "palert" }).primaryKey(),
    /** Lowercased. A signed-in customer's account email, never a typed one. */
    email: model.text(),
    customer_id: model.text().nullable(),
    product_id: model.text(),
    /** Set when a specific size/colour was chosen; empty means any variant. */
    variant_id: model.text().nullable(),
    /** Availability is judged against this channel's stock locations. */
    sales_channel_id: model.text(),
    /** Decided at signup, so the email says "back in stock" or "it's here". */
    reason: model.enum(["restock", "launch"]),
    status: model.enum(["waiting", "sent", "cancelled"]).default("waiting"),
    notified_at: model.dateTime().nullable(),
    cancelled_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["status", "product_id"], where: "deleted_at IS NULL" },
    { on: ["email", "status"], where: "deleted_at IS NULL" },
    { on: ["customer_id"], where: "deleted_at IS NULL" },
  ]);
