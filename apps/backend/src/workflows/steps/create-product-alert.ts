import { MedusaError, ProductStatus } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PRODUCT_ALERT_MODULE } from "../../modules/product-alert";
import type ProductAlertModuleService from "../../modules/product-alert/service";
import {
  findPurchasableVariantIds,
  isAlertDue,
  isComingSoon,
  retrieveAlertProducts,
} from "../utils/product-availability";

export type CreateProductAlertInput = {
  email: string;
  customer_id?: string | null;
  product_id: string;
  variant_id?: string | null;
  sales_channel_id: string;
};

export type ProductAlertSummary = {
  id: string;
  product_id: string;
  variant_id: string | null;
  reason: "restock" | "launch";
  status: "waiting" | "sent" | "cancelled" | "failed";
  created_at: Date | string;
};

type Compensation = { created: string } | { claimed: string } | null;

/**
 * Nobody is emailed at signup, so one address cannot pile up alerts to flood
 * someone else's inbox later.
 */
const MAX_WAITING_ALERTS_PER_EMAIL = 50;

function summarize(alert: ProductAlertSummary): ProductAlertSummary {
  return {
    id: alert.id,
    product_id: alert.product_id,
    variant_id: alert.variant_id,
    reason: alert.reason,
    status: alert.status,
    created_at: alert.created_at,
  };
}

/**
 * Records "tell me when I can buy this". Asking twice for the same item from
 * the same address returns the alert already waiting. An item that can be
 * bought right now is refused: the email would go out within minutes and say
 * something the shopper can already see.
 */
export const createProductAlertStep = createStep(
  "create-product-alert",
  async (input: CreateProductAlertInput, { container }) => {
    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    const email = input.email.trim().toLowerCase();
    const variantId = input.variant_id ?? null;

    const product = (
      await retrieveAlertProducts(container, [input.product_id])
    ).get(input.product_id);

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ${input.product_id} was not found.`,
      );
    }

    if (variantId && !product.variants.some((v) => v.id === variantId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${variantId} does not belong to product ${input.product_id}.`,
      );
    }

    const comingSoon = isComingSoon(product.metadata);

    if (!comingSoon) {
      const purchasable = await findPurchasableVariantIds(
        container,
        [product],
        input.sales_channel_id,
      );

      if (isAlertDue({ variant_id: variantId }, product, purchasable)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This item is available to buy now.",
        );
      }
    }

    const [existing] = await service.listProductAlerts({
      email,
      product_id: input.product_id,
      variant_id: variantId,
      status: "waiting",
    });

    if (existing) {
      // A guest alert that the customer asks for again after signing in now
      // shows up in their account.
      if (input.customer_id && !existing.customer_id) {
        await service.updateProductAlerts({
          id: existing.id,
          customer_id: input.customer_id,
        });

        return new StepResponse(summarize(existing), {
          claimed: existing.id,
        } as Compensation);
      }

      return new StepResponse(summarize(existing), null as Compensation);
    }

    const [, waiting] = await service.listAndCountProductAlerts(
      { email, status: "waiting" },
      { select: ["id"], take: 1 },
    );

    if (waiting >= MAX_WAITING_ALERTS_PER_EMAIL) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This address is already waiting on too many items.",
      );
    }

    const created = await service.createProductAlerts({
      email,
      customer_id: input.customer_id ?? null,
      product_id: input.product_id,
      variant_id: variantId,
      sales_channel_id: input.sales_channel_id,
      reason: comingSoon ? "launch" : "restock",
      status: "waiting",
    });

    return new StepResponse(summarize(created), {
      created: created.id,
    } as Compensation);
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    if ("created" in compensation) {
      await service.deleteProductAlerts(compensation.created);
      return;
    }

    await service.updateProductAlerts({
      id: compensation.claimed,
      customer_id: null,
    });
  },
);
