import { randomBytes } from "node:crypto";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import type {
  ILockingModule,
  MedusaContainer,
} from "@medusajs/framework/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";
import {
  confirmationToken,
  newsletterLockKey,
  SIGNUP_COOLDOWN_MS,
} from "../../modules/newsletter/tokens";

export type CaptureNewsletterSignupInput = { email: string; source?: string };

export async function captureNewsletterSignup(
  input: CaptureNewsletterSignupInput,
  container: MedusaContainer,
) {
  const service: NewsletterModuleService = container.resolve(NEWSLETTER_MODULE);
  const locking: ILockingModule = container.resolve(Modules.LOCKING);
  const settings = await service.retrieveSettings();
  if (!settings.enabled) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Newsletter signup is currently closed.",
    );
  }
  const email = input.email.trim().toLowerCase();
  return await locking.execute(newsletterLockKey(email), async () => {
    const [existing] = await service.listNewsletterSubscribers({ email });
    const now = new Date();
    const coolingDown =
      existing?.consent_at &&
      now.getTime() - new Date(existing.consent_at).getTime() <
        SIGNUP_COOLDOWN_MS;
    if (existing && (existing.status === "subscribed" || coolingDown)) {
      return {
        id: existing.id,
        email,
        status: existing.status,
        token: existing.token,
        confirmation_token: confirmationToken(existing),
        needs_confirmation: existing.status === "pending",
        already_subscribed: true,
      };
    }
    const attributes = {
      email,
      status: settings.double_opt_in
        ? ("pending" as const)
        : ("subscribed" as const),
      source: input.source ?? null,
      consent_text: settings.consent_text,
      consent_at: now,
      confirmed_at: settings.double_opt_in ? null : now,
      unsubscribed_at: null,
      token: randomBytes(32).toString("hex"),
      sync_pending: true,
    };
    const [subscriber] = existing
      ? await service.updateNewsletterSubscribers([
          { id: existing.id, ...attributes },
        ])
      : await service.createNewsletterSubscribers([attributes]);
    return {
      id: subscriber.id,
      email,
      status: subscriber.status,
      token: subscriber.token,
      confirmation_token: confirmationToken(subscriber),
      needs_confirmation: settings.double_opt_in,
      already_subscribed: false,
    };
  });
}

export const captureNewsletterSignupStep = createStep(
  "capture-newsletter-signup",
  async (input: CaptureNewsletterSignupInput, { container }) =>
    new StepResponse(await captureNewsletterSignup(input, container)),
);
