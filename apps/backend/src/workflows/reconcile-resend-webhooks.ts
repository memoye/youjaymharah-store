import {
  createStep,
  createWorkflow,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { NEWSLETTER_MODULE } from "../modules/newsletter";
import type NewsletterModuleService from "../modules/newsletter/service";
import { ResendConsentEvent } from "../modules/newsletter/resend-webhook";
import { processResendWebhook } from "./steps/process-resend-webhook";

const reconcileResendWebhooksStep = createStep(
  "reconcile-resend-webhooks",
  async (_, { container }) => {
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const [fresh, retries] = await Promise.all([
      service.listResendWebhookEvents(
        { processed_at: null, attempted_at: null },
        { take: 25, order: { created_at: "ASC" } },
      ),
      service.listResendWebhookEvents(
        {
          processed_at: null,
          attempted_at: { $lt: new Date(Date.now() - 60_000) },
        },
        { take: 25, order: { attempted_at: "ASC" } },
      ),
    ]);
    for (const receipt of [...fresh, ...retries]) {
      try {
        await processResendWebhook(
          ResendConsentEvent.parse(receipt.payload),
          container,
        );
      } catch {
        logger.error(
          `resend-webhook: receipt ${receipt.id} remains pending; retry scheduled.`,
        );
      }
    }
    return new StepResponse(null);
  },
);

export const reconcileResendWebhooksWorkflow = createWorkflow(
  "reconcile-resend-webhooks",
  () => {
    reconcileResendWebhooksStep();
  },
);
