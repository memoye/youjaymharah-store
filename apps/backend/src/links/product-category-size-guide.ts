import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import SizeGuideModule from "../modules/size-guide";

/**
 * A category's default size guide, used by every product in it (and in its
 * subcategories) that has no guide of its own.
 */
export default defineLink(
  { linkable: ProductModule.linkable.productCategory, isList: true },
  SizeGuideModule.linkable.sizeGuide,
);
