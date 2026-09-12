import { model } from "@medusajs/framework/utils";

import { WishlistItem } from "./wishlist-item";

/** One wishlist per customer, created on their first save. */
export const Wishlist = model
  .define("wishlist", {
    id: model.id({ prefix: "wl" }).primaryKey(),
    customer_id: model.text(),
    items: model.hasMany(() => WishlistItem, { mappedBy: "wishlist" }),
  })
  .cascades({ delete: ["items"] })
  .indexes([
    { on: ["customer_id"], unique: true, where: "deleted_at IS NULL" },
  ]);
