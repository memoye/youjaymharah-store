import { MedusaService } from "@medusajs/framework/utils";

import { Branding } from "./models/branding";

/** The single row every branding read and write addresses. */
export const BRANDING_ID = "branding_default";

class BrandingModuleService extends MedusaService({
  Branding,
}) {
  /**
   * Returns the branding row, creating it on first access so the admin never
   * opens an empty state that asks a manager to "create branding" first.
   *
   * Defaults come from env so an existing deployment keeps its current look
   * until someone edits it in the dashboard.
   */
  async retrieveSettings() {
    const existing = await this.listBrandings({ id: BRANDING_ID });

    if (existing.length) {
      return existing[0];
    }

    const [created] = await this.createBrandings([
      {
        id: BRANDING_ID,
        name: process.env.STORE_NAME ?? "Youjaymharah",
        logo_url: null,
        support_email: process.env.SUPPORT_EMAIL ?? "support@youjaymharah.com",
      },
    ]);

    return created;
  }
}

export default BrandingModuleService;
