import {
  createStep,
  createWorkflow,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { NEWSLETTER_MODULE } from "../modules/newsletter";
import type NewsletterModuleService from "../modules/newsletter/service";
import { syncNewsletterContact } from "./steps/sync-newsletter-contact";

const reconcileNewsletterStep = createStep(
  "reconcile-newsletter",
  async (_, { container }) => {
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const filters = {
      sync_pending: true,
      status: ["subscribed", "unsubscribed"],
    };
    const [newSubscribers, retries] = await Promise.all([
      service.listNewsletterSubscribers(
        { ...filters, sync_attempted_at: null },
        { take: 50, order: { created_at: "ASC" } },
      ),
      service.listNewsletterSubscribers(
        {
          ...filters,
          sync_attempted_at: { $lt: new Date(Date.now() - 60_000) },
        },
        { take: 50, order: { sync_attempted_at: "ASC" } },
      ),
    ]);
    const subscribers = [...newSubscribers, ...retries];
    for (const subscriber of subscribers) {
      try {
        await syncNewsletterContact(
          { subscriber_id: subscriber.id },
          container,
        );
      } catch {
        logger.error(
          `newsletter: reconciliation deferred for subscriber ${subscriber.id}.`,
        );
      }
    }
    return new StepResponse(null);
  },
);

export const reconcileNewsletterWorkflow = createWorkflow(
  "reconcile-newsletter",
  () => {
    reconcileNewsletterStep();
  },
);
