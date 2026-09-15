/**
 * The home page hero, as stored and as the storefront receives it. With a
 * desktop video the hero is a video and the images are its posters (shown
 * while it loads, when autoplay is blocked, and to shoppers who reduce
 * motion); without one it is a photo.
 */
export type HomepageHero = {
  enabled: boolean;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  desktop_video_url: string | null;
  mobile_video_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

const TEXT_FIELDS = [
  "eyebrow",
  "title",
  "description",
  "desktop_image_url",
  "mobile_image_url",
  "desktop_video_url",
  "mobile_video_url",
  "cta_label",
  "cta_url",
] as const;

/** How many replaced heroes are kept for staff to restore. */
export const HERO_HISTORY_LIMIT = 10;

/** Whether anything was filled in; a hero that is only switched on or off doesn't count. */
export function hasHeroContent(hero: HomepageHero): boolean {
  return TEXT_FIELDS.some((field) => hero[field] !== null);
}

/** Field-by-field equality of two complete heroes. */
export function isSameHero(a: HomepageHero, b: HomepageHero): boolean {
  return (
    a.enabled === b.enabled &&
    TEXT_FIELDS.every((field) => a[field] === b[field])
  );
}

/**
 * Every hero field, set to its value or null, with the hero off unless it was
 * explicitly turned on. Always stored in this complete form: JSON fields merge
 * on update, so a field simply left out would keep its old value instead of
 * being cleared. Also used when reading, so rows saved before the hero existed
 * come back with the same shape.
 */
export function completeHomepageHero(
  hero: Partial<Record<string, unknown>> | null | undefined,
): HomepageHero {
  const text = Object.fromEntries(
    TEXT_FIELDS.map((field) => {
      const value = hero?.[field];
      return [field, typeof value === "string" && value ? value : null];
    }),
  ) as Omit<HomepageHero, "enabled">;

  return { enabled: hero?.enabled === true, ...text };
}
