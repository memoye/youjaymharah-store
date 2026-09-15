import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

import type { HomepageHeroType } from "../../api/middlewares";
import { STOREFRONT_SETTINGS_MODULE } from "../../modules/storefront-settings";
import {
  completeHomepageHero,
  hasHeroContent,
  HERO_HISTORY_LIMIT,
  isSameHero,
} from "../../modules/storefront-settings/homepage-hero";
import type StorefrontSettingsModuleService from "../../modules/storefront-settings/service";

export type RecordHomepageHeroRevisionInput = {
  /** The hero about to be saved; undefined when the save doesn't touch it. */
  homepage_hero?: HomepageHeroType;
  replaced_by?: string | null;
};

type Compensation = { created: string; trimmed: string[] };

/**
 * Keeps the hero that a save is about to replace, so staff can restore it.
 * Runs before the settings update: nothing is recorded when the hero isn't
 * part of the save, is unchanged, or had never been filled in. The oldest
 * entries beyond HERO_HISTORY_LIMIT are soft-deleted, so undoing the step can
 * bring them back.
 */
export const recordHomepageHeroRevisionStep = createStep(
  "record-homepage-hero-revision",
  async (input: RecordHomepageHeroRevisionInput, { container }) => {
    if (!input.homepage_hero) {
      return new StepResponse(null);
    }

    const service: StorefrontSettingsModuleService = container.resolve(
      STOREFRONT_SETTINGS_MODULE,
    );

    const settings = await service.retrieveSettings();
    const current = completeHomepageHero(
      settings.homepage_hero as Record<string, unknown>,
    );
    const next = completeHomepageHero(input.homepage_hero);

    if (!hasHeroContent(current) || isSameHero(current, next)) {
      return new StepResponse(null);
    }

    const [revision] = await service.createHomepageHeroRevisions([
      { hero: current, replaced_by: input.replaced_by ?? null },
    ]);

    const kept = await service.listHomepageHeroRevisions(
      {},
      { select: ["id"], order: { created_at: "DESC", id: "DESC" } },
    );
    const trimmed = kept.slice(HERO_HISTORY_LIMIT).map(({ id }) => id);

    if (trimmed.length) {
      await service.softDeleteHomepageHeroRevisions(trimmed);
    }

    return new StepResponse<typeof revision, Compensation>(revision, {
      created: revision.id,
      trimmed,
    });
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return;
    }

    const service: StorefrontSettingsModuleService = container.resolve(
      STOREFRONT_SETTINGS_MODULE,
    );

    await service.deleteHomepageHeroRevisions([compensation.created]);

    if (compensation.trimmed.length) {
      await service.restoreHomepageHeroRevisions(compensation.trimmed);
    }
  },
);
