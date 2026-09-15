/**
 * Reading `metadata` fields staff edit in the admin. The admin boxes save a
 * cleared field as an empty string rather than removing the key, and metadata
 * is untyped JSON, so every read goes through one of these instead of a bare
 * `metadata?.field`.
 */

/** A text field, trimmed, or null when missing, empty or not a string. */
export function metaText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

/** An image address, or null unless it is an absolute http(s) URL. */
export function metaImage(value: unknown): string | null {
  const text = metaText(value)

  return text && /^https?:\/\//i.test(text) ? text : null
}
