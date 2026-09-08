import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { AdminUpdateNewsletterSettingsType } from "../../../middlewares";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterModuleService from "../../../../modules/newsletter/service";
import { updateNewsletterSettingsWorkflow } from "../../../../workflows/newsletter";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

  res.json({ settings: await service.retrieveSettings() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateNewsletterSettingsType>,
  res: MedusaResponse,
) => {
  const { result } = await updateNewsletterSettingsWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  res.json({ settings: result });
};
