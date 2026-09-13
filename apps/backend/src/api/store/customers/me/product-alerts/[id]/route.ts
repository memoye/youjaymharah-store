import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { cancelCustomerProductAlertWorkflow } from "../../../../../../workflows/product-alerts";

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  await cancelCustomerProductAlertWorkflow(req.scope).run({
    input: {
      alert_id: req.params.id,
      customer_id: req.auth_context.actor_id,
    },
  });

  res.json({ id: req.params.id, object: "product_alert", deleted: true });
};
