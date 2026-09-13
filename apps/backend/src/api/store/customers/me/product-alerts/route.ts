import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { PRODUCT_ALERT_MODULE } from "../../../../../modules/product-alert";
import type ProductAlertModuleService from "../../../../../modules/product-alert/service";

/**
 * The customer's alerts, newest first: waiting ones and those already sent.
 * Alerts asked for as a guest appear once the customer asks again while
 * signed in.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: ProductAlertModuleService =
    req.scope.resolve(PRODUCT_ALERT_MODULE);

  const alerts = await service.listProductAlerts(
    {
      customer_id: req.auth_context.actor_id,
      status: ["waiting", "sent"],
    },
    {
      select: [
        "id",
        "product_id",
        "variant_id",
        "reason",
        "status",
        "created_at",
        "notified_at",
      ],
      order: { created_at: "DESC" },
      take: 100,
    },
  );

  res.json({ alerts });
};
