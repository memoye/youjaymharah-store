import { describe, expect, it } from "vitest"
import {
  adjacentAnnouncementId,
  announcementMode,
  dismissalKey,
  snapshotLifetime,
  visibleAnnouncements,
  type AnnouncementItem,
  type AnnouncementSnapshot,
} from "./helpers"

const item: AnnouncementItem = {
  id: "one",
  message: "Hello",
  href: null,
  link_label: null,
  promotion_code: null,
  ends_at: null,
}
const snapshot: AnnouncementSnapshot = {
  appearance: "dark",
  dismissible: true,
  server_time: "2026-09-20T12:00:00Z",
  valid_until: "2026-09-20T12:01:00Z",
  items: [item, { ...item, id: "two" }],
}

describe("announcement banner helpers", () => {
  it("selects hidden, static, or carousel mode from the visible count", () => {
    expect([0, 1, 2, 20].map(announcementMode)).toEqual([
      "hidden",
      "static",
      "carousel",
      "carousel",
    ])
  })
  it("wraps navigation in both directions and handles removal of the selected item", () => {
    expect(adjacentAnnouncementId(snapshot.items, "two", 1)).toBe("one")
    expect(adjacentAnnouncementId(snapshot.items, "one", -1)).toBe("two")
    expect(adjacentAnnouncementId(snapshot.items, "removed", 1)).toBe("two")
    expect(adjacentAnnouncementId([], null, 1)).toBeNull()
  })
  it("removes dismissed entries and transitions to static/hidden", () => {
    const remaining = visibleAnnouncements(snapshot, [dismissalKey(item)])
    expect(remaining.map((entry) => entry.id)).toEqual(["two"])
    expect(announcementMode(remaining.length)).toBe("static")
    expect(
      visibleAnnouncements(snapshot, snapshot.items.map(dismissalKey)),
    ).toEqual([])
    expect(visibleAnnouncements(null, [])).toEqual([])
  })
  it("shows edited announcements again and respects disabling dismissal", () => {
    const dismissed = [dismissalKey(item)]
    expect(
      visibleAnnouncements(
        { ...snapshot, items: [{ ...item, message: "Updated" }] },
        dismissed,
      ),
    ).toHaveLength(1)
    expect(
      visibleAnnouncements({ ...snapshot, dismissible: false }, dismissed),
    ).toHaveLength(2)
    expect(dismissalKey({ ...item, promotion_code: "NEW" })).not.toBe(
      dismissalKey(item),
    )
  })
  it("expires conservatively without relying on the shopper's clock", () => {
    expect(snapshotLifetime(snapshot, 500)).toBe(59_500)
    expect(snapshotLifetime(snapshot, 61_000)).toBe(0)
    expect(snapshotLifetime({ ...snapshot, valid_until: "bad" }, 0)).toBe(0)
    expect(
      snapshotLifetime({ ...snapshot, valid_until: "2026-09-21T12:00:00Z" }, 0),
    ).toBe(60_000)
  })
})
