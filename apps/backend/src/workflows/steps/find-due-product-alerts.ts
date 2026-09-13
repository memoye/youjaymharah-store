import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PRODUCT_ALERT_MODULE } from "../../modules/product-alert";
import type ProductAlertModuleService from "../../modules/product-alert/service";
import {
  findPurchasableVariantIds,
  isAlertDue,
  retrieveAlertProducts,
} from "../utils/product-availability";

export type DueProductAlert = {
  alert_id: string;
  email: string;
  reason: "restock" | "launch";
  product: { title: string; handle: string; thumbnail: string | null };
  variant_title: string | null;
};

export type FindDueProductAlertsOutput = {
  due: DueProductAlert[];
  /** Waiting on a product or variant that no longer exists. */
  orphaned_ids: string[];
};

const PAGE_SIZE = 500;

/**
 * Every waiting alert whose item can be bought now. Read-only: sending and
 * status changes happen in the steps after it.
 */
export const findDueProductAlertsStep = createStep(
  "find-due-product-alerts",
  async (_input: void, { container }) => {
    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    const waiting: {
      id: string;
      email: string;
      product_id: string;
      variant_id: string | null;
      sales_channel_id: string;
      reason: "restock" | "launch";
    }[] = [];

    for (let skip = 0; ; skip += PAGE_SIZE) {
      const page = await service.listProductAlerts(
        { status: "waiting" },
        {
          select: [
            "id",
            "email",
            "product_id",
            "variant_id",
            "sales_channel_id",
            "reason",
          ],
          take: PAGE_SIZE,
          skip,
          order: { created_at: "ASC" },
        },
      );

      waiting.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }
    }

    const output: FindDueProductAlertsOutput = { due: [], orphaned_ids: [] };

    if (!waiting.length) {
      return new StepResponse(output);
    }

    const products = await retrieveAlertProducts(container, [
      ...new Set(waiting.map((alert) => alert.product_id)),
    ]);

    const byChannel = new Map<string, typeof waiting>();

    for (const alert of waiting) {
      const group = byChannel.get(alert.sales_channel_id) ?? [];
      group.push(alert);
      byChannel.set(alert.sales_channel_id, group);
    }

    for (const [salesChannelId, alerts] of byChannel) {
      const channelProducts = [
        ...new Set(alerts.map((alert) => alert.product_id)),
      ].flatMap((id) => {
        const product = products.get(id);
        return product ? [product] : [];
      });

      const purchasable = await findPurchasableVariantIds(
        container,
        channelProducts,
        salesChannelId,
      );

      for (const alert of alerts) {
        const product = products.get(alert.product_id);
        const variant = alert.variant_id
          ? product?.variants.find((v) => v.id === alert.variant_id)
          : undefined;

        if (!product || (alert.variant_id && !variant)) {
          output.orphaned_ids.push(alert.id);
          continue;
        }

        if (!isAlertDue(alert, product, purchasable)) {
          continue;
        }

        output.due.push({
          alert_id: alert.id,
          email: alert.email,
          reason: alert.reason,
          product: {
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail,
          },
          variant_title: variant?.title ?? null,
        });
      }
    }

    return new StepResponse(output);
  },
);
