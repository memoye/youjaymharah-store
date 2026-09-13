import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import {
  cancelCustomerProductAlertStep,
  cancelOrphanedProductAlertsStep,
  type CancelCustomerProductAlertInput,
} from "./steps/cancel-product-alerts";
import {
  createProductAlertStep,
  type CreateProductAlertInput,
} from "./steps/create-product-alert";
import { findDueProductAlertsStep } from "./steps/find-due-product-alerts";
import { retrieveProductMetadataStep } from "./steps/retrieve-product-metadata";
import { sendProductAlertEmailsStep } from "./steps/send-product-alert-emails";
import {
  COMING_SOON_METADATA_KEY,
  isComingSoon,
  LAUNCHED_AT_METADATA_KEY,
} from "./utils/product-availability";

export const createProductAlertWorkflow = createWorkflow(
  "create-product-alert",
  function (input: CreateProductAlertInput) {
    const alert = createProductAlertStep(input);

    return new WorkflowResponse(alert);
  },
);

export const cancelCustomerProductAlertWorkflow = createWorkflow(
  "cancel-customer-product-alert",
  function (input: CancelCustomerProductAlertInput) {
    const result = cancelCustomerProductAlertStep(input);

    return new WorkflowResponse(result);
  },
);

/**
 * Run by jobs/send-product-alerts.ts. Checks every waiting alert against
 * current stock rather than reacting to stock events: stock changes through
 * many paths (admin edits, returns, cancelled orders, expiring reservations),
 * and not all of them emit an event.
 */
export const sendDueProductAlertsWorkflow = createWorkflow(
  "send-due-product-alerts",
  function () {
    const found = findDueProductAlertsStep();

    const orphaned = transform({ found }, ({ found }) => ({
      ids: found.orphaned_ids,
    }));

    const cancelled = cancelOrphanedProductAlertsStep(orphaned);

    const due = transform({ found }, ({ found }) => ({ due: found.due }));

    const result = sendProductAlertEmailsStep(due);

    return new WorkflowResponse({
      sent: result.sent,
      failed: result.failed,
      cancelled: cancelled.cancelled,
    });
  },
);

export type SetProductComingSoonInput = {
  product_id: string;
  coming_soon: boolean;
};

/**
 * Turns "coming soon" on or off. Off does not email anyone directly: the next
 * alert run sends launch emails once the product also has stock.
 *
 * Switching from on to off is the launch, so it also stamps
 * `metadata.launched_at`, which restarts the storefront's "New" badge.
 * Switching off a product that was not coming soon changes nothing, and a
 * relaunch (on, then off again) stamps the new date.
 */
export const setProductComingSoonWorkflow = createWorkflow(
  "set-product-coming-soon",
  function (input: SetProductComingSoonInput) {
    const product = retrieveProductMetadataStep({
      product_id: input.product_id,
    });

    const metadata = transform({ input, product }, ({ input, product }) => {
      const launching = isComingSoon(product.metadata) && !input.coming_soon;

      return {
        ...product.metadata,
        [COMING_SOON_METADATA_KEY]: input.coming_soon,
        ...(launching
          ? { [LAUNCHED_AT_METADATA_KEY]: new Date().toISOString() }
          : {}),
      };
    });

    const updateInput = transform({ input, metadata }, ({ input, metadata }) => ({
      selector: { id: input.product_id },
      update: { metadata },
    }));

    updateProductsWorkflow.runAsStep({ input: updateInput });

    const result = transform({ input, metadata }, ({ input, metadata }) => ({
      id: input.product_id,
      coming_soon: input.coming_soon,
      launched_at:
        typeof metadata[LAUNCHED_AT_METADATA_KEY] === "string"
          ? (metadata[LAUNCHED_AT_METADATA_KEY] as string)
          : null,
    }));

    return new WorkflowResponse(result);
  },
);
