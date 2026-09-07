import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import CredoPaymentProvider from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [CredoPaymentProvider],
});
