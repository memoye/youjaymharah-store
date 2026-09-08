import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreNewsletterSubscribeType } from "../../../middlewares";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterModuleService from "../../../../modules/newsletter/service";
import { subscribeToNewsletterWorkflow } from "../../../../workflows/newsletter";

export const POST = async (
  req: MedusaRequest<StoreNewsletterSubscribeType>,
  res: MedusaResponse,
) => {
  const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);
  const settings = await service.retrieveSettings();

  await subscribeToNewsletterWorkflow(req.scope).run({
    input: {
      email: req.validatedBody.email,
      source: req.validatedBody.source ?? "storefront",
    },
  });

  // The same response whether the address was new, pending or already on the
  // list -- the endpoint is public, so it must not reveal membership.
  res.json({
    success: true,
    message: settings.success_message ?? "Thanks. Check your inbox to confirm.",
  });
};
