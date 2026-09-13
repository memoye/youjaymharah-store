import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { PRODUCT_ALERT_MODULE } from "../../../../../modules/product-alert";
import type ProductAlertModuleService from "../../../../../modules/product-alert/service";

/**
 * How many shoppers are waiting on a product, per size. Counts only: the
 * addresses belong to the newsletter and customer records, not to this page.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: ProductAlertModuleService =
    req.scope.resolve(PRODUCT_ALERT_MODULE);

  const [waiting, [, sent]] = await Promise.all([
    service.listProductAlerts(
      { product_id: req.params.id, status: "waiting" },
      { select: ["id", "variant_id"] },
    ),
    service.listAndCountProductAlerts(
      { product_id: req.params.id, status: "sent" },
      { select: ["id"], take: 1 },
    ),
  ]);

  const counts = new Map<string | null, number>();

  for (const alert of waiting) {
    counts.set(alert.variant_id, (counts.get(alert.variant_id) ?? 0) + 1);
  }

  res.json({
    alerts: {
      waiting: waiting.length,
      sent,
      by_variant: [...counts].map(([variant_id, count]) => ({
        variant_id,
        count,
      })),
    },
  });
};
