import type { StoreAnnouncementsResponse } from "@youjaymharah/api-types"

export type AnnouncementSnapshot = StoreAnnouncementsResponse
export type AnnouncementItem = AnnouncementSnapshot["items"][number]

export function announcementMode(count: number) {
  return count === 0 ? "hidden" : count === 1 ? "static" : "carousel"
}

/** Editing visible content makes a dismissed message eligible again. */
export function dismissalKey(item: AnnouncementItem) {
  return JSON.stringify([
    item.id,
    item.message,
    item.link_label,
    item.href,
    item.promotion_code,
    item.ends_at,
  ])
}

export function visibleAnnouncements(
  snapshot: AnnouncementSnapshot | null,
  dismissed: readonly string[],
) {
  return (
    snapshot?.items.filter(
      (item) =>
        !snapshot.dismissible || !dismissed.includes(dismissalKey(item)),
    ) ?? []
  )
}

export function adjacentAnnouncementId(
  items: AnnouncementItem[],
  currentId: string | null,
  direction: 1 | -1,
) {
  if (!items.length) return null
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === currentId),
  )
  return items[(index + direction + items.length) % items.length].id
}

/** Use the server clock and conservatively subtract the entire request duration. */
export function snapshotLifetime(
  snapshot: AnnouncementSnapshot,
  requestDuration: number,
) {
  const lifetime =
    Date.parse(snapshot.valid_until) -
    Date.parse(snapshot.server_time) -
    requestDuration
  return Number.isFinite(lifetime) ? Math.max(0, Math.min(60_000, lifetime)) : 0
}
