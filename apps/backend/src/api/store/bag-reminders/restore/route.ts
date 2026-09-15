import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreBagReminderTokenType } from "../../../middlewares";
import { restoreBagFromReminderWorkflow } from "../../../../workflows/bag-reminders";

/**
 * The "View your bag" link. Returns the bag's cart id for the storefront to
 * put back in the shopper's cart cookie; 404 once the bag was checked out.
 */
export const POST = async (
  req: MedusaRequest<StoreBagReminderTokenType>,
  res: MedusaResponse,
) => {
  const { result } = await restoreBagFromReminderWorkflow(req.scope).run({
    input: { token: req.validatedBody.token },
  });

  res.json({ cart_id: result.cart_id });
};
