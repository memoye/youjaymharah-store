import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { STOREFRONT_SETTINGS_MODULE } from "../../../../modules/storefront-settings";
import {
  completeHomepageHero,
  HERO_HISTORY_LIMIT,
} from "../../../../modules/storefront-settings/homepage-hero";
import type StorefrontSettingsModuleService from "../../../../modules/storefront-settings/service";

type StaffUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

/** Heroes replaced by earlier saves, newest first, with who replaced them. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );

  const revisions = await service.listHomepageHeroRevisions(
    {},
    {
      order: { created_at: "DESC", id: "DESC" },
      take: HERO_HISTORY_LIMIT,
    },
  );

  const userIds = [
    ...new Set(
      revisions
        .map((revision) => revision.replaced_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const users = new Map<string, StaffUser>();

  if (userIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: userIds },
    });

    for (const user of data as StaffUser[]) {
      users.set(user.id, user);
    }
  }

  res.json({
    revisions: revisions.map((revision) => {
      const user = revision.replaced_by
        ? users.get(revision.replaced_by)
        : undefined;

      return {
        id: revision.id,
        hero: completeHomepageHero(revision.hero as Record<string, unknown>),
        replaced_at: revision.created_at,
        // A deleted staff account still shows as someone, just without a name.
        replaced_by: revision.replaced_by
          ? {
              id: revision.replaced_by,
              email: user?.email ?? null,
              name:
                [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
                null,
            }
          : null,
      };
    }),
  });
};
