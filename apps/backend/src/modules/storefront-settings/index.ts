import { Module } from "@medusajs/framework/utils";

import StorefrontSettingsModuleService from "./service";

export const STOREFRONT_SETTINGS_MODULE = "storefrontSettings";

export default Module(STOREFRONT_SETTINGS_MODULE, {
  service: StorefrontSettingsModuleService,
});
