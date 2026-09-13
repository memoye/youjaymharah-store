import { Module } from "@medusajs/framework/utils";
import ProductAlertModuleService from "./service";

export const PRODUCT_ALERT_MODULE = "productAlert";

export default Module(PRODUCT_ALERT_MODULE, {
  service: ProductAlertModuleService,
});
