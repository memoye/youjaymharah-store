import { model } from "@medusajs/framework/utils";

/**
 * Newsletter configuration. Singleton, like branding: one row, edited from
 * Settings -> Newsletter. Kept in the database rather than env so the client
 * can turn signup off or reword consent copy without a deploy.
 */
export const NewsletterSettings = model.define("newsletter_settings", {
  id: model.id().primaryKey(),
  enabled: model.boolean().default(false),
  /** Resend audience (segment) that confirmed contacts are pushed into. */
  audience_id: model.text().nullable(),
  double_opt_in: model.boolean().default(true),
  consent_text: model.text().nullable(),
  success_message: model.text().nullable(),
  reply_to: model.text().nullable(),
  checkout_opt_in: model.boolean().default(false),
  checkout_label: model.text().nullable(),
});
