import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { HomepageHero } from "../../../../../middlewares";
import { STOREFRONT_SETTINGS_MODULE } from "../../../../../../modules/storefront-settings";
import { completeHomepageHero } from "../../../../../../modules/storefront-settings/homepage-hero";
import type StorefrontSettingsModuleService from "../../../../../../modules/storefront-settings/service";
import { updateStorefrontSettingsWorkflow } from "../../../../../../workflows/update-storefront-settings";
import { adminSettings } from "../../../../../../modules/storefront-settings/admin-settings";

/**
 * Makes a previous hero the current one, exactly as it was (shown or hidden).
 * It goes through the normal save, so the hero it replaces joins the history
 * and a restore can itself be undone.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const service: StorefrontSettingsModuleService = req.scope.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );

  const [revision] = await service.listHomepageHeroRevisions({
    id: req.params.id,
  });

  if (!revision) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "That previous banner no longer exists. Only the most recent ones are kept.",
    );
  }

  // Checked against today's rules, in case they have tightened since it was
  // saved.
  const parsed = HomepageHero.safeParse(
    completeHomepageHero(revision.hero as Record<string, unknown>),
  );

  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `This banner can't be restored as it is: ${parsed.error.issues[0]?.message ?? "it is incomplete"}`,
    );
  }

  const { result } = await updateStorefrontSettingsWorkflow(req.scope).run({
    input: { homepage_hero: parsed.data, actor_id: req.auth_context.actor_id },
  });

  res.json({ settings: adminSettings(result) });
};
