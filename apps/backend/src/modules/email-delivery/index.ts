import { Module } from "@medusajs/framework/utils";
import EmailDeliveryModuleService from "./service";

export const EMAIL_DELIVERY_MODULE = "emailDelivery";
export default Module(EMAIL_DELIVERY_MODULE, {
  service: EmailDeliveryModuleService,
});
