import { model } from "@medusajs/framework/utils";

import { WishlistItem } from "./wishlist-item";

/**
 * One wishlist per customer, created on their first save. A guest's wishlist
 * has no customer: its ID is the only way to reach it, the way a guest cart's
 * is, and it is merged into the customer's own list when they sign in.
 */
export const Wishlist = model
  .define("wishlist", {
    id: model.id({ prefix: "wl" }).primaryKey(),
    customer_id: model.text().nullable(),
    items: model.hasMany(() => WishlistItem, { mappedBy: "wishlist" }),
  })
  .cascades({ delete: ["items"] })
  .indexes([
    { on: ["customer_id"], unique: true, where: "deleted_at IS NULL" },
  ]);
