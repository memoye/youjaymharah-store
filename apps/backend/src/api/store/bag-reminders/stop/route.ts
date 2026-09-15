import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreBagReminderTokenType } from "../../../middlewares";
import { stopBagRemindersWorkflow } from "../../../../workflows/bag-reminders";

/**
 * The "Stop bag reminders" link: no more reminders to this address. Safe to
 * call again.
 */
export const POST = async (
  req: MedusaRequest<StoreBagReminderTokenType>,
  res: MedusaResponse,
) => {
  const { result } = await stopBagRemindersWorkflow(req.scope).run({
    input: { token: req.validatedBody.token },
  });

  res.json({ status: result.status });
};
