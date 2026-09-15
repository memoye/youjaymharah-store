import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import type { AdminUpdateBagReminderSettingsType } from "../../../middlewares";
import { BAG_REMINDER_MODULE } from "../../../../modules/bag-reminder";
import type BagReminderModuleService from "../../../../modules/bag-reminder/service";
import { updateBagReminderSettingsWorkflow } from "../../../../workflows/bag-reminders";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: BagReminderModuleService =
    req.scope.resolve(BAG_REMINDER_MODULE);

  res.json({ settings: await service.retrieveSettings() });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateBagReminderSettingsType>,
  res: MedusaResponse,
) => {
  const { result } = await updateBagReminderSettingsWorkflow(req.scope).run({
    input: req.validatedBody,
  });

  res.json({ settings: result });
};
