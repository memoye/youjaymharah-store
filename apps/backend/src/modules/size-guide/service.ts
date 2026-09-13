import { MedusaService } from "@medusajs/framework/utils";
import { SizeGuide } from "./models/size-guide";

class SizeGuideModuleService extends MedusaService({
  SizeGuide,
}) {}

export default SizeGuideModuleService;
