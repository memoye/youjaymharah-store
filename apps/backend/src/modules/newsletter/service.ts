import { MedusaService } from "@medusajs/framework/utils";

import { NewsletterSettings } from "./models/newsletter-settings";
import { NewsletterSubscriber } from "./models/newsletter-subscriber";

/** The single settings row every newsletter read and write addresses. */
export const NEWSLETTER_SETTINGS_ID = "newsletter_settings_default";

export const DEFAULT_CONSENT_TEXT =
  "I agree to receive marketing emails. Unsubscribe any time.";

class NewsletterModuleService extends MedusaService({
  NewsletterSubscriber,
  NewsletterSettings,
}) {
  /**
   * Returns settings, creating them on first access so the admin page never
   * opens an empty state. Signup ships disabled: nothing is captured until
   * someone turns it on and picks an audience.
   */
  async retrieveSettings() {
    const existing = await this.listNewsletterSettings({
      id: NEWSLETTER_SETTINGS_ID,
    });

    if (existing.length) {
      return existing[0];
    }

    const [created] = await this.createNewsletterSettings([
      {
        id: NEWSLETTER_SETTINGS_ID,
        enabled: false,
        double_opt_in: true,
        consent_text: DEFAULT_CONSENT_TEXT,
        success_message: "Thanks. Check your inbox to confirm.",
        checkout_opt_in: false,
      },
    ]);

    return created;
  }
}

export default NewsletterModuleService;
