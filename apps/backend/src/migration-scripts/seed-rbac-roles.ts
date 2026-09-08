import type { MedusaContainer } from "@medusajs/framework/types";

import { provisionRbacRoles } from "../lib/rbac-roles";

/** First-run provisioning on a fresh environment. See src/lib/rbac-roles.ts. */
export default async function seedRbacRoles({
  container,
}: {
  container: MedusaContainer;
}) {
  await provisionRbacRoles(container);
}
