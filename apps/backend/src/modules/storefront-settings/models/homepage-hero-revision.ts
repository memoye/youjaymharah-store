import { model } from "@medusajs/framework/utils";

/**
 * A home page hero that was replaced, so staff can bring it back. One row per
 * save that changed the hero; the newest few are kept (HERO_HISTORY_LIMIT).
 *
 * Rows rather than a JSON list on the settings row: JSON fields merge on
 * update, which would splice an old list into a new one.
 */
export const HomepageHeroRevision = model.define("homepage_hero_revision", {
  id: model.id({ prefix: "hhrev" }).primaryKey(),
  /** The complete hero as it was before the save (see homepage-hero.ts). */
  hero: model.json(),
  /** The admin user whose save replaced it; null for scripts. */
  replaced_by: model.text().nullable(),
});
