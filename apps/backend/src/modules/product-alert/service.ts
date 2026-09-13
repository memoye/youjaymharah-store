import { MedusaService } from "@medusajs/framework/utils";
import { ProductAlert } from "./models/product-alert";

class ProductAlertModuleService extends MedusaService({
  ProductAlert,
}) {}

export default ProductAlertModuleService;
