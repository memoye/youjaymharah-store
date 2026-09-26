/**
 * What signup says until the admin writes its own. Kept import-free so the
 * admin page can show it as the placeholder for an empty field.
 *
 * A null heading or description means "use these", the same convention as
 * the success message: a store that never edits the copy picks up changes to
 * the defaults.
 */
export const DEFAULT_NEWSLETTER_HEADING = "The YJ Edit";

export const DEFAULT_NEWSLETTER_DESCRIPTION =
  "New collections, considered pieces and invitations to discover what's next.";

/** The signup copy is display text in a footer, not an essay. */
export const NEWSLETTER_HEADING_MAX = 80;
export const NEWSLETTER_DESCRIPTION_MAX = 280;
