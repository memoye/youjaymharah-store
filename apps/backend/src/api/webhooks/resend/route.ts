import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { verifyResendWebhook } from "../../../modules/newsletter/resend-webhook";
import { processResendWebhookWorkflow } from "../../../workflows/process-resend-webhook";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ message: "Webhook receiver is not configured." });
    return;
  }
  let event;
  try {
    event = verifyResendWebhook(req.rawBody, req.headers, secret);
  } catch {
    res.status(400).json({ message: "Invalid webhook." });
    return;
  }
  if (event)
    await processResendWebhookWorkflow(req.scope).run({ input: event });
  res.json({ received: true });
};
