import type { ExecArgs } from "@medusajs/framework/types";

import { provisionRbacRoles } from "../lib/rbac-roles";

/**
 * Re-runnable role provisioning:
 *
 *   pnpm exec medusa exec ./src/scripts/seed-rbac-roles.ts
 *
 * Run this after adding a module that defines new policies, so existing roles
 * pick up the new grants. Idempotent -- it only attaches what is missing.
 */
export default async function seedRbacRolesScript({ container }: ExecArgs) {
  await provisionRbacRoles(container);
}
