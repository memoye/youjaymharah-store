import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

/**
 * Attaches the core-seeded Super Admin role to admin users that have none.
 *
 * Required whenever a user was created before the RBAC feature flag was
 * enabled (via `medusa user` or an invite accepted without roles): their JWT
 * carries no `app_metadata.roles`, so every policy-guarded admin route
 * returns Forbidden. This writes the user<->role link directly (core's
 * assignUserRolesWorkflow would reject the same role-less actor it is meant
 * to bootstrap). After running this, affected users must log out and back
 * in -- roles are read from the token at login time.
 *
 * Usage:
 *   pnpm exec medusa exec ./src/scripts/attach-super-admin.ts
 *   pnpm exec medusa exec ./src/scripts/attach-super-admin.ts -- user@example.com
 */
export default async function attachSuperAdmin({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  const email = (args as string[])[0];
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email", "rbac_roles.id"],
    ...(email ? { filters: { email } } : {}),
  });

  const roleless = users.filter(
    (user) => !user.rbac_roles || user.rbac_roles.length === 0,
  );

  if (!roleless.length) {
    logger.info(
      email
        ? `User ${email} already has a role; nothing to do.`
        : "All admin users already have roles; nothing to do.",
    );
    return;
  }

  // Verify the core-seeded Super Admin role exists before linking.
  const { data: roles } = await query.graph({
    entity: "rbac_role",
    fields: ["id", "name"],
    filters: { id: "role_super_admin" },
  });

  if (!roles.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Role 'role_super_admin' not found. Run `medusa db:migrate` first -- the RBAC module seeds it on startup.",
    );
  }

  for (const user of roleless) {
    await link.create([
      {
        [Modules.USER]: { user_id: user.id },
        [Modules.RBAC]: { rbac_role_id: "role_super_admin" },
      },
    ]);

    logger.info(`Attached "Super Admin" to ${user.email}.`);
  }

  logger.info(
    "Done. Affected users must log out and back in for their token to pick up the roles.",
  );
}
