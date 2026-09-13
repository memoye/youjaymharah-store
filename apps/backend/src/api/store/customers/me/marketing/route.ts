import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import type { StoreSetMarketingPreferenceType } from "../../../../middlewares";
import { NEWSLETTER_MODULE } from "../../../../../modules/newsletter";
import type NewsletterModuleService from "../../../../../modules/newsletter/service";
import {
  subscribeToNewsletterWorkflow,
  unsubscribeFromNewsletterWorkflow,
} from "../../../../../workflows/newsletter";

async function customerEmail(
  scope: MedusaContainer,
  customerId: string,
): Promise<string> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["email"],
    filters: { id: customerId },
  });

  if (!customer?.email) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "This account has no email address.",
    );
  }

  return customer.email.trim().toLowerCase();
}

/**
 * The newsletter status of the account's email address. "pending" means a
 * confirmation email was sent and not yet clicked.
 */
async function readPreference(scope: MedusaContainer, email: string) {
  const service: NewsletterModuleService = scope.resolve(NEWSLETTER_MODULE);

  const [settings, [subscriber]] = await Promise.all([
    service.retrieveSettings(),
    service.listNewsletterSubscribers({ email }),
  ]);

  return {
    status: (subscriber?.status ?? "none") as
      "none" | "pending" | "subscribed" | "unsubscribed",
    /** False while signup is switched off in Settings -> Newsletter. */
    available: settings.enabled,
    consent_text: settings.consent_text,
  };
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const email = await customerEmail(req.scope, req.auth_context.actor_id);

  res.json({ marketing: await readPreference(req.scope, email) });
};

/**
 * Turns marketing email on or off for the account's address. On follows the
 * same double opt-in as the storefront signup: customer email addresses are
 * not verified, so an account alone does not prove the address consented.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreSetMarketingPreferenceType>,
  res: MedusaResponse,
) => {
  const email = await customerEmail(req.scope, req.auth_context.actor_id);

  if (req.validatedBody.subscribed) {
    await subscribeToNewsletterWorkflow(req.scope).run({
      input: { email, source: "account" },
    });
  } else {
    const service: NewsletterModuleService =
      req.scope.resolve(NEWSLETTER_MODULE);
    const [subscriber] = await service.listNewsletterSubscribers({ email });

    if (subscriber && subscriber.status !== "unsubscribed") {
      await unsubscribeFromNewsletterWorkflow(req.scope).run({
        input: { token: subscriber.token },
      });
    }
  }

  res.json({ marketing: await readPreference(req.scope, email) });
};
