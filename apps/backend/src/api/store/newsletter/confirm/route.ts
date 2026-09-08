import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreNewsletterTokenType } from "../../../middlewares";
import { confirmNewsletterSubscriptionWorkflow } from "../../../../workflows/newsletter";

export const POST = async (
  req: MedusaRequest<StoreNewsletterTokenType>,
  res: MedusaResponse,
) => {
  await confirmNewsletterSubscriptionWorkflow(req.scope).run({
    input: { token: req.validatedBody.token },
  });

  res.json({ success: true, status: "subscribed" });
};
