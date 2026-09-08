import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterModuleService from "../../../../modules/newsletter/service";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const status = req.query.status as string | undefined;

  const [subscribers, count] = await service.listAndCountNewsletterSubscribers(
    status ? { status } : {},
    { take: limit, skip: offset, order: { created_at: "DESC" } },
  );

  res.json({ subscribers, count, limit, offset });
};
