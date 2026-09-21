import { model } from "@medusajs/framework/utils";

export const ResendWebhookEvent = model.define("resend_webhook_event", {
  id: model.id({ prefix: "rsev" }).primaryKey(),
  event_type: model.text(),
  occurred_at: model.dateTime(),
  payload: model.json().nullable(),
  processed_at: model.dateTime().nullable(),
  attempted_at: model.dateTime().nullable(),
});
