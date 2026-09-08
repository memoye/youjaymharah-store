import { randomBytes } from "node:crypto";

import { MedusaError } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { NEWSLETTER_MODULE } from "../../modules/newsletter";
import type NewsletterModuleService from "../../modules/newsletter/service";

export type CaptureNewsletterSignupInput = {
  email: string;
  source?: string;
};

export type CaptureNewsletterSignupOutput = {
  id: string;
  email: string;
  status: string;
  token: string;
  /** True when the caller should send the confirmation email. */
  needs_confirmation: boolean;
  /** True when the address is already on the list and nothing was sent. */
  already_subscribed: boolean;
};

/**
 * Records a signup and decides what happens next.
 *
 * The branching lives here rather than in the workflow body because workflow
 * composition cannot contain conditionals, and because "has this address
 * signed up before" is a single decision that should not be split across
 * steps where a partial failure could leave a half-written subscriber.
 */
export const captureNewsletterSignupStep = createStep(
  "capture-newsletter-signup",
  async (input: CaptureNewsletterSignupInput, { container }) => {
    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    const settings = await service.retrieveSettings();

    if (!settings.enabled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Newsletter signup is currently closed.",
      );
    }

    const email = input.email.trim().toLowerCase();
    const [existing] = await service.listNewsletterSubscribers({ email });

    // A confirmed subscriber signing up again is a no-op, not an error --
    // telling a stranger "this address is already subscribed" would leak
    // whether someone is on the list.
    if (existing?.status === "subscribed") {
      return new StepResponse(
        {
          id: existing.id,
          email,
          status: existing.status,
          token: existing.token,
          needs_confirmation: false,
          already_subscribed: true,
        },
        undefined as string | undefined,
      );
    }

    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const doubleOptIn = settings.double_opt_in;

    const attributes = {
      email,
      status: doubleOptIn ? ("pending" as const) : ("subscribed" as const),
      source: input.source ?? null,
      consent_text: settings.consent_text,
      consent_at: now,
      confirmed_at: doubleOptIn ? null : now,
      unsubscribed_at: null,
      token,
    };

    if (existing) {
      // Covers the resubscribe case: a previously unsubscribed or still
      // pending address gets a fresh token and a fresh consent timestamp.
      await service.updateNewsletterSubscribers([
        { id: existing.id, ...attributes },
      ]);

      return new StepResponse(
        {
          id: existing.id,
          email,
          status: attributes.status,
          token,
          needs_confirmation: doubleOptIn,
          already_subscribed: false,
        },
        undefined as string | undefined,
      );
    }

    const [created] = await service.createNewsletterSubscribers([attributes]);

    return new StepResponse(
      {
        id: created.id,
        email,
        status: attributes.status,
        token,
        needs_confirmation: doubleOptIn,
        already_subscribed: false,
      },
      created.id,
    );
  },
  async (createdId, { container }) => {
    // Only removes rows this step created; an updated pre-existing subscriber
    // is left alone rather than being deleted on rollback.
    if (!createdId) {
      return;
    }

    const service: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE);

    await service.deleteNewsletterSubscribers([createdId]);
  },
);
