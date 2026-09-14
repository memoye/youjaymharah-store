/** The social profiles a store can list, in the order the admin shows them. */
export const SOCIAL_NETWORKS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "pinterest",
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/**
 * Every network, set to its URL or null. Always stored in this complete form:
 * JSON fields merge on update, so a network simply left out would keep its old
 * URL instead of being removed.
 */
export function completeSocialLinks(
  links: Partial<Record<string, unknown>> | null | undefined,
): Record<SocialNetwork, string | null> {
  return Object.fromEntries(
    SOCIAL_NETWORKS.map((network) => {
      const value = links?.[network];
      return [network, typeof value === "string" && value ? value : null];
    }),
  ) as Record<SocialNetwork, string | null>;
}
