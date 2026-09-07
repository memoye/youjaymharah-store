import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import PaystackPaymentProvider from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaystackPaymentProvider],
});
