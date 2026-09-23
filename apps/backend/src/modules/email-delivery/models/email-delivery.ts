import { model } from "@medusajs/framework/utils";

export const EmailDelivery = model.define("email_delivery", {
  id: model.id().primaryKey(),
  status: model
    .enum(["prepared", "attempted", "accepted", "needs_review"])
    .default("prepared"),
  payload_ciphertext: model.text().nullable(),
  first_attempt_at: model.dateTime().nullable(),
  accepted_at: model.dateTime().nullable(),
  provider_id: model.text().nullable(),
  attempts: model.number().default(0),
});
