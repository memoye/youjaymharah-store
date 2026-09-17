import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { StoreCartReminderTokenType } from "../../../middlewares";
import { restoreCartFromReminderWorkflow } from "../../../../workflows/cart-reminders";

/**
 * The "View your bag" link. Returns the cart id for the storefront to
 * put back in the shopper's cart cookie; 404 once the cart was checked out.
 */
export const POST = async (
  req: MedusaRequest<StoreCartReminderTokenType>,
  res: MedusaResponse,
) => {
  const { result } = await restoreCartFromReminderWorkflow(req.scope).run({
    input: { token: req.validatedBody.token },
  });

  res.json({ cart_id: result.cart_id });
};
