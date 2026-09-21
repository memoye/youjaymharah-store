import type { MedusaContainer } from "@medusajs/framework/types";
import { reconcileResendWebhooksWorkflow } from "../workflows/reconcile-resend-webhooks";

export default async function reconcileResendWebhooks(
  container: MedusaContainer,
) {
  await reconcileResendWebhooksWorkflow(container).run();
}

export const config = {
  name: "reconcile-resend-webhooks",
  schedule: "* * * * *",
};
