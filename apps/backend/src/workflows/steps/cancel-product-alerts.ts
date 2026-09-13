import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PRODUCT_ALERT_MODULE } from "../../modules/product-alert";
import type ProductAlertModuleService from "../../modules/product-alert/service";

export type CancelCustomerProductAlertInput = {
  alert_id: string;
  customer_id: string;
};

/**
 * Cancels one of the customer's own waiting alerts. Another customer's alert
 * reads as not found, so alert IDs can't be probed. Cancelling twice is a
 * no-op.
 */
export const cancelCustomerProductAlertStep = createStep(
  "cancel-customer-product-alert",
  async (input: CancelCustomerProductAlertInput, { container }) => {
    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    const [alert] = await service.listProductAlerts({
      id: input.alert_id,
      customer_id: input.customer_id,
    });

    if (!alert) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product alert ${input.alert_id} was not found.`,
      );
    }

    if (alert.status !== "waiting") {
      return new StepResponse({ id: alert.id }, null as string | null);
    }

    await service.updateProductAlerts({
      id: alert.id,
      status: "cancelled",
      cancelled_at: new Date(),
    });

    return new StepResponse({ id: alert.id }, alert.id as string | null);
  },
  async (alertId, { container }) => {
    if (!alertId) {
      return;
    }

    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    await service.updateProductAlerts({
      id: alertId,
      status: "waiting",
      cancelled_at: null,
    });
  },
);

export type CancelOrphanedProductAlertsInput = { ids: string[] };

/**
 * Cancels alerts whose product or variant was deleted: nothing can ever make
 * them due, and they would otherwise be re-checked forever.
 */
export const cancelOrphanedProductAlertsStep = createStep(
  "cancel-orphaned-product-alerts",
  async (input: CancelOrphanedProductAlertsInput, { container }) => {
    if (!input.ids.length) {
      return new StepResponse({ cancelled: 0 }, [] as string[]);
    }

    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    const now = new Date();

    await service.updateProductAlerts(
      input.ids.map((id) => ({
        id,
        status: "cancelled" as const,
        cancelled_at: now,
      })),
    );

    return new StepResponse({ cancelled: input.ids.length }, input.ids);
  },
  async (ids, { container }) => {
    if (!ids?.length) {
      return;
    }

    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    await service.updateProductAlerts(
      ids.map((id) => ({ id, status: "waiting" as const, cancelled_at: null })),
    );
  },
);
