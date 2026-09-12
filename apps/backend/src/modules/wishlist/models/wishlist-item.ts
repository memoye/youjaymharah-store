import { model } from "@medusajs/framework/utils";

import { Wishlist } from "./wishlist";

/**
 * A saved product. `product_variant_id` is set when the customer saved a
 * specific colour/size from the product page, and left empty when they saved
 * the product itself (e.g. the heart on a product card).
 */
export const WishlistItem = model
  .define("wishlist_item", {
    id: model.id({ prefix: "wli" }).primaryKey(),
    product_id: model.text(),
    product_variant_id: model.text().nullable(),
    wishlist: model.belongsTo(() => Wishlist, { mappedBy: "items" }),
  })
  .indexes([{ on: ["wishlist_id", "product_id"] }]);
