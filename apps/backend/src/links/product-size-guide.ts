import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import SizeGuideModule from "../modules/size-guide";

/**
 * A product's own size guide, overriding its category's. One guide serves
 * many products; a product has at most one.
 */
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  SizeGuideModule.linkable.sizeGuide,
);
