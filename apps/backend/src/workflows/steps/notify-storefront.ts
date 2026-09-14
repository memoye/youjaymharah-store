import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import { STOREFRONT_URL } from "../../modules/resend/emails/constants";

export type NotifyStorefrontInput = {
  /**
   * Next.js cache tags to refresh, e.g. "storefront-settings" (the tag
   * `getStorefrontSettings()` in apps/storefront caches under).
   */
  tags: string[];
};

/** A storefront that is slow to answer must not hold up the admin's save. */
const TIMEOUT_MS = 5000;

/**
 * Tells the storefront that data it caches has changed, so it refreshes now
 * instead of when its cache expires (5 minutes for storefront settings).
 *
 * Sends `POST <STOREFRONT_URL>/api/revalidate` with the shared secret in the
 * `x-revalidate-secret` header and `{ "tags": [...] }` as the body. The
 * storefront's route checks the secret and calls `revalidateTag` for each tag.
 *
 * Best effort by design: skipped when STOREFRONT_REVALIDATE_SECRET is not
 * set, and a failure is only logged. The save that triggered it has already
 * succeeded, and the storefront still picks the change up when its cache
 * expires.
 */
export const notifyStorefrontStep = createStep(
  "notify-storefront",
  async (input: NotifyStorefrontInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const secret = process.env.STOREFRONT_REVALIDATE_SECRET;

    if (!secret) {
      logger.debug(
        "notify-storefront: STOREFRONT_REVALIDATE_SECRET is not set; the storefront refreshes on its own schedule.",
      );
      return new StepResponse({ notified: false });
    }

    const url = new URL("/api/revalidate", STOREFRONT_URL);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ tags: input.tags }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        logger.warn(
          `notify-storefront: ${url.origin} answered ${response.status} when refreshing ${input.tags.join(", ")}; it will refresh when its cache expires.`,
        );
        return new StepResponse({ notified: false });
      }

      return new StepResponse({ notified: true });
    } catch (error) {
      logger.warn(
        `notify-storefront: could not reach ${url.origin} to refresh ${input.tags.join(", ")}: ${
          (error as Error).message
        }. It will refresh when its cache expires.`,
      );
      return new StepResponse({ notified: false });
    }
  },
);
