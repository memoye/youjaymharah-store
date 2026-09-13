import type { INotificationModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { BRANDING_MODULE } from "../../modules/branding";
import type BrandingModuleService from "../../modules/branding/service";
import { PRODUCT_ALERT_MODULE } from "../../modules/product-alert";
import type ProductAlertModuleService from "../../modules/product-alert/service";
import { EmailTemplates } from "../../modules/resend/emails";
import { STOREFRONT_URL } from "../../modules/resend/emails/constants";
import type { DueProductAlert } from "./find-due-product-alerts";

export type SendProductAlertEmailsInput = { due: DueProductAlert[] };

/**
 * Emails each due alert and marks it sent.
 *
 * A failed send is logged and the alert stays waiting, so the next run tries
 * again; one bad address does not hold up everyone else. Each email carries
 * the alert's ID as its idempotency key, so an alert that was emailed but not
 * yet marked sent (a crash between the two) is never emailed twice.
 */
export const sendProductAlertEmailsStep = createStep(
  "send-product-alert-emails",
  async (input: SendProductAlertEmailsInput, { container }) => {
    if (!input.due.length) {
      return new StepResponse({ sent: 0, failed: 0 });
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION);
    const brandingModuleService: BrandingModuleService =
      container.resolve(BRANDING_MODULE);
    const service: ProductAlertModuleService =
      container.resolve(PRODUCT_ALERT_MODULE);

    const brand = await brandingModuleService.retrieveSettings();

    let sent = 0;
    let failed = 0;

    for (const alert of input.due) {
      try {
        await notificationModuleService.createNotifications({
          to: alert.email,
          channel: "email",
          template:
            alert.reason === "launch"
              ? EmailTemplates.PRODUCT_LAUNCHED
              : EmailTemplates.PRODUCT_BACK_IN_STOCK,
          data: {
            brand,
            product: {
              title: alert.product.title,
              thumbnail: alert.product.thumbnail,
              url: `${STOREFRONT_URL}/products/${encodeURIComponent(alert.product.handle)}`,
            },
            variant_title: alert.variant_title,
          },
          idempotency_key: `product-alert:${alert.alert_id}`,
        });

        await service.updateProductAlerts({
          id: alert.alert_id,
          status: "sent",
          notified_at: new Date(),
        });

        sent += 1;
      } catch (error) {
        failed += 1;
        logger.warn(
          `product-alerts: could not email alert ${alert.alert_id}; it stays waiting for the next run: ${
            (error as Error).message
          }`,
        );
      }
    }

    return new StepResponse({ sent, failed });
  },
);
