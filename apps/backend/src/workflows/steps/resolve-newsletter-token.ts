import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";

export type ResolveNewsletterTokenInput = {
  token: string;
  action: "confirm" | "unsubscribe";
};

/**
 * Looks up a subscriber by its single-use token and applies the state change.
 *
 * Confirming an already-confirmed address, or unsubscribing an already
 * unsubscribed one, succeeds quietly -- people click these links twice, and a
 * scary error page on the second click is worse than a no-op.
 */
export const resolveNewsletterTokenStep = createStep(
  "resolve-newsletter-token",
  async (input: ResolveNewsletterTokenInput, { container }) => {
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    const [subscriber] = await service.listNewsletterSubscribers({
      token: input.token,
    });

    if (!subscriber) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "That link is no longer valid. Please sign up again.",
      );
    }

    const previous = {
      status: subscriber.status,
      confirmed_at: subscriber.confirmed_at,
      unsubscribed_at: subscriber.unsubscribed_at,
    };

    const now = new Date();

    if (input.action === "confirm") {
      if (subscriber.status !== "subscribed") {
        await service.updateNewsletterSubscribers([
          {
            id: subscriber.id,
            status: "subscribed",
            confirmed_at: now,
            unsubscribed_at: null,
          },
        ]);
      }
    } else if (subscriber.status !== "unsubscribed") {
      await service.updateNewsletterSubscribers([
        { id: subscriber.id, status: "unsubscribed", unsubscribed_at: now },
      ]);
    }

    return new StepResponse(
      { id: subscriber.id, email: subscriber.email },
      { id: subscriber.id, ...previous },
    );
  },
  async (previous, { container }) => {
    if (!previous) {
      return;
    }

    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    await service.updateNewsletterSubscribers([previous]);
  },
);
