import type { MedusaContainer } from "@medusajs/framework/types";
import { reconcileNewsletterWorkflow } from "../workflows/reconcile-newsletter";

export default async function reconcileNewsletter(container: MedusaContainer) {
  await reconcileNewsletterWorkflow(container).run();
}

export const config = { name: "reconcile-newsletter", schedule: "*/5 * * * *" };
