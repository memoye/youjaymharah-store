import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreCartReminderTokenType } from "../../../middlewares";
import { stopCartRemindersWorkflow } from "../../../../workflows/cart-reminders";

/**
 * The "Stop bag reminders" link: no more reminders to this address. Safe to
 * call again.
 */
export const POST = async (
  req: MedusaRequest<StoreCartReminderTokenType>,
  res: MedusaResponse,
) => {
  const { result } = await stopCartRemindersWorkflow(req.scope).run({
    input: { token: req.validatedBody.token },
  });

  res.json({ status: result.status });
};
