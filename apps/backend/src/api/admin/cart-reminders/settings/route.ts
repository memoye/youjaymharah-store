import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { AdminUpdateCartReminderSettingsType } from "../../../middlewares";
import { CART_REMINDER_MODULE } from "../../../../modules/cart-reminder";
import type CartReminderModuleService from "../../../../modules/cart-reminder/service";
import { updateCartReminderSettingsWorkflow } from "../../../../workflows/cart-reminders";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: CartReminderModuleService =
    req.scope.resolve(CART_REMINDER_MODULE);

  res.json({ settings: await service.retrieveSettings() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateCartReminderSettingsType>,
  res: MedusaResponse,
) => {
  const { result } = await updateCartReminderSettingsWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  res.json({ settings: result });
};
