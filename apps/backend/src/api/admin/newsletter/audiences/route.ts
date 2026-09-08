import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { ResendAudienceClient } from "../../../../modules/newsletter/resend-audience";

/**
 * Backs the audience picker on the settings page. Proxied through the backend
 * so the Resend API key never reaches the browser.
 */
export const GET = async (
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const client = new ResendAudienceClient();

  res.json({ audiences: await client.listAudiences() });
};
