import type { MedusaContainer } from "@medusajs/framework/types";
import {
  AnnouncementBar,
  announcementStatus,
  promotionIsAvailable,
  readAnnouncementBar,
  type Announcement,
} from "../announcements";
import {
  resolveAnnouncements,
  validateAnnouncementBar,
} from "../announcement-resolver";

const now = Date.parse("2026-09-20T12:00:00Z");
const iso = (delta: number) => new Date(now + delta).toISOString();
const item: Announcement = {
  id: "one",
  enabled: true,
  message: "New arrivals",
  link_label: "Shop now",
  destination: { type: "page", id: "new-arrivals" },
  starts_at: null,
  ends_at: null,
  promotion_id: null,
};
const bar = (items: Announcement[]) => ({
  enabled: true,
  appearance: "dark" as const,
  dismissible: true,
  items,
});
function mockContainer(
  records: Record<string, Record<string, unknown>[]> = {},
) {
  const graph = jest.fn(async ({ entity }: { entity: string }) => ({
    data: records[entity] ?? [],
  }));
  return {
    container: { resolve: () => ({ graph }) } as unknown as MedusaContainer,
    graph,
  };
}

describe("announcement validation", () => {
  it("allows an empty bar and fails closed on malformed data", () => {
    expect(AnnouncementBar.parse(bar([])).items).toEqual([]);
    expect(readAnnouncementBar({ items: "bad" }).enabled).toBe(false);
  });
  it("rejects duplicate IDs, too many entries, empty copy, unpaired links, and invalid windows", () => {
    const invalid = [
      bar([item, item]),
      bar(
        Array.from({ length: 21 }, (_, index) => ({
          ...item,
          id: String(index),
        })),
      ),
      bar([{ ...item, message: " " }]),
      bar([{ ...item, link_label: null }]),
      bar([{ ...item, starts_at: iso(1000), ends_at: iso(1000) }]),
      bar([{ ...item, destination: { type: "page", id: "missing" } as never }]),
    ];
    for (const value of invalid)
      expect(AnnouncementBar.safeParse(value).success).toBe(false);
  });
  it("includes the start instant and excludes the end instant", () => {
    expect(announcementStatus({ ...item, starts_at: iso(0) }, now)).toBe(
      "live",
    );
    expect(announcementStatus({ ...item, ends_at: iso(0) }, now)).toBe("ended");
    expect(announcementStatus({ ...item, starts_at: iso(1) }, now)).toBe(
      "scheduled",
    );
    expect(announcementStatus({ ...item, enabled: false }, now)).toBe("hidden");
  });
  it("rejects stale references on save, including when entered by scripts", async () => {
    const { container } = mockContainer();
    await expect(
      validateAnnouncementBar(
        container,
        bar([{ ...item, destination: { type: "collection", id: "missing" } }]),
      ),
    ).rejects.toThrow("destination");
    await expect(
      validateAnnouncementBar(
        container,
        bar([{ ...item, promotion_id: "missing" }]),
      ),
    ).rejects.toThrow("promotion");
    await expect(
      validateAnnouncementBar(
        container,
        bar([{ ...item, message: "  trimmed  " }]),
      ),
    ).resolves.toMatchObject({ items: [{ message: "trimmed" }] });
  });
});

describe("public announcements", () => {
  it("returns only live content in configured order and expires at the next schedule boundary", async () => {
    const { container } = mockContainer();
    const result = await resolveAnnouncements(
      container,
      bar([
        item,
        {
          ...item,
          id: "future",
          message: "Private future copy",
          starts_at: iso(5000),
        },
        { ...item, id: "draft", enabled: false },
        { ...item, id: "ended", ends_at: iso(0) },
        { ...item, id: "two" },
      ]),
      [],
      now,
    );
    expect(result.items.map((entry) => entry.id)).toEqual(["one", "two"]);
    expect(JSON.stringify(result)).not.toContain("Private future copy");
    expect(result.valid_until).toBe(iso(5000));
    expect(result.items[0].href).toBe("/new-arrivals");
  });
  it("does no lookups when globally disabled and supports no announcements", async () => {
    const { container, graph } = mockContainer();
    expect(
      (
        await resolveAnnouncements(
          container,
          { ...bar([item]), enabled: false },
          [],
          now,
        )
      ).items,
    ).toEqual([]);
    expect(
      (await resolveAnnouncements(container, bar([]), [], now)).items,
    ).toEqual([]);
    expect(graph).not.toHaveBeenCalled();
  });
  it("uses current handles and hides missing destinations", async () => {
    const { container } = mockContainer({
      product_collection: [{ handle: "updated handle" }],
    });
    const value = bar([
      { ...item, destination: { type: "collection", id: "col" } },
    ]);
    expect(
      (await resolveAnnouncements(container, value, [], now)).items[0].href,
    ).toBe("/collections/updated%20handle");
    expect(
      (await resolveAnnouncements(mockContainer().container, value, [], now))
        .items,
    ).toEqual([]);
  });
  it("hides private categories and products outside the requesting sales channels", async () => {
    const records = {
      product_category: [
        { handle: "private", is_active: true, is_internal: true },
      ],
      product: [
        {
          handle: "product",
          status: "published",
          sales_channels: [{ id: "channel-a" }],
        },
      ],
    };
    const { container } = mockContainer(records);
    const value = bar([
      { ...item, destination: { type: "category", id: "cat" } },
      { ...item, id: "two", destination: { type: "product", id: "prod" } },
    ]);
    expect(
      (await resolveAnnouncements(container, value, ["channel-b"], now)).items,
    ).toEqual([]);
    expect(
      (await resolveAnnouncements(container, value, ["channel-a"], now)).items,
    ).toHaveLength(1);
    records.product[0].status = "draft";
    expect(
      (await resolveAnnouncements(container, value, ["channel-a"], now)).items,
    ).toEqual([]);
  });
  it("derives manual codes and expires at the related campaign end", async () => {
    const promotion = {
      status: "active",
      code: "SAVE10",
      is_automatic: false,
      campaign: { ends_at: iso(3000) },
    };
    const { container } = mockContainer({ promotion: [promotion] });
    const value = bar([{ ...item, promotion_id: "promo" }]);
    const result = await resolveAnnouncements(container, value, [], now);
    expect(result.items[0]).toMatchObject({
      promotion_code: "SAVE10",
      ends_at: iso(3000),
    });
    expect(result.valid_until).toBe(iso(3000));
    promotion.is_automatic = true;
    expect(
      (await resolveAnnouncements(container, value, [], now)).items[0]
        .promotion_code,
    ).toBeNull();
    promotion.status = "inactive";
    expect(
      (await resolveAnnouncements(container, value, [], now)).items,
    ).toEqual([]);
    expect(
      (await resolveAnnouncements(mockContainer().container, value, [], now))
        .items,
    ).toEqual([]);
  });
  it("rechecks when a related campaign starts without publishing future copy", async () => {
    const { container } = mockContainer({
      promotion: [{ status: "active", campaign: { starts_at: iso(1000) } }],
    });
    const result = await resolveAnnouncements(
      container,
      bar([{ ...item, promotion_id: "promo" }]),
      [],
      now,
    );
    expect(result.items).toEqual([]);
    expect(result.valid_until).toBe(iso(1000));
  });
});

describe("related promotion availability", () => {
  it("respects status, campaign dates and global budgets, not per-customer budgets", () => {
    expect(promotionIsAvailable({ status: "active" }, now)).toBe(true);
    expect(promotionIsAvailable({ status: "inactive" }, now)).toBe(false);
    expect(
      promotionIsAvailable(
        { status: "active", campaign: { starts_at: iso(1) } },
        now,
      ),
    ).toBe(false);
    expect(
      promotionIsAvailable(
        { status: "active", campaign: { ends_at: iso(0) } },
        now,
      ),
    ).toBe(false);
    for (const type of ["spend", "usage"]) {
      expect(
        promotionIsAvailable(
          {
            status: "active",
            campaign: { budget: { type, limit: "10", used: "10" } },
          },
          now,
        ),
      ).toBe(false);
    }
    expect(
      promotionIsAvailable(
        {
          status: "active",
          campaign: { budget: { type: "use_by_attribute", limit: 1, used: 5 } },
        },
        now,
      ),
    ).toBe(true);
  });
});
