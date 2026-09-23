import { MedusaService } from "@medusajs/framework/utils";
import { EmailDelivery } from "./models/email-delivery";

export default class EmailDeliveryModuleService extends MedusaService({
  EmailDelivery,
}) {}
