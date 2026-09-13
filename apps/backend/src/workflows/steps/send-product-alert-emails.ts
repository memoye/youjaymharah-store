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
 * Failed sends before an alert is given up on. Runs are 10 minutes apart, so
 * a Resend outage shorter than about 50 minutes still gets through, while an
 * address Resend will never accept stops being retried.
 */
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Emails each due alert and marks it sent.
 *
 * The idempotency key is the alert plus its attempt number. An alert emailed
 * but not yet marked sent (a crash between the two) reuses the same key on
 * the next run, so it is not emailed twice. A failed send moves to the next
 * attempt number instead: the notification module keeps the failed record
 * under the old key, and sending again under that key errors rather than
 * retrying.
 *
 * A failure is logged and never fails the run, so one bad address does not
 * hold up everyone else.
 */
export const sendProductAlertEmailsStep = createStep(
  "send-product-alert-emails",
  async (input: SendProductAlertEmailsInput, { container }) => {
    if (!input.due.length) {
      return new StepResponse({ sent: 0, failed: 0, given_up: 0 });
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
    let givenUp = 0;

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
          idempotency_key: `product-alert:${alert.alert_id}:${alert.failed_attempts}`,
        });
      } catch (error) {
        failed += 1;

        const attempts = alert.failed_attempts + 1;
        const giveUp = attempts >= MAX_FAILED_ATTEMPTS;

        if (giveUp) {
          givenUp += 1;
        }

        await service.updateProductAlerts({
          id: alert.alert_id,
          failed_attempts: attempts,
          ...(giveUp ? { status: "failed" as const } : {}),
        });

        logger.warn(
          `product-alerts: could not email alert ${alert.alert_id} (attempt ${attempts} of ${MAX_FAILED_ATTEMPTS})${
            giveUp ? "; giving up" : "; retrying on the next run"
          }: ${(error as Error).message}`,
        );

        continue;
      }

      await service.updateProductAlerts({
        id: alert.alert_id,
        status: "sent",
        notified_at: new Date(),
      });

      sent += 1;
    }

    return new StepResponse({ sent, failed, given_up: givenUp });
  },
);
