import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterModuleService from "../../../../modules/newsletter/service";
import { AdminNewsletterSubscribersQuery } from "../../../middlewares";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: NewsletterModuleService = req.scope.resolve(NEWSLETTER_MODULE);

  const { limit, offset, status } = AdminNewsletterSubscribersQuery.parse(
    req.validatedQuery,
  );

  const [subscribers, count] = await service.listAndCountNewsletterSubscribers(
    status ? { status } : {},
    {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
      select: [
        "id",
        "email",
        "status",
        "source",
        "consent_text",
        "consent_at",
        "confirmed_at",
        "unsubscribed_at",
        "resend_contact_id",
        "sync_pending",
        "sync_attempted_at",
        "created_at",
        "updated_at",
      ],
    },
  );

  const [confirmed, pending, syncPending] = await Promise.all([
    service.listAndCountNewsletterSubscribers({ status: "subscribed" }, { select: ["id"], take: 1 }),
    service.listAndCountNewsletterSubscribers({ status: "pending" }, { select: ["id"], take: 1 }),
    service.listAndCountNewsletterSubscribers({ status: ["subscribed", "unsubscribed"], sync_pending: true }, { select: ["id"], take: 1 }),
  ]);
  res.json({ subscribers, count, limit, offset, stats: { confirmed: confirmed[1], pending: pending[1], sync_pending: syncPending[1] } });
};
