import { z } from "@medusajs/framework/zod";

export const AnnouncementDestination = z.discriminatedUnion("type", [
  z.object({ type: z.literal("collection"), id: z.string().trim().min(1) }),
  z.object({ type: z.literal("category"), id: z.string().trim().min(1) }),
  z.object({ type: z.literal("product"), id: z.string().trim().min(1) }),
  z.object({
    type: z.literal("page"),
    id: z.enum(["home", "new-arrivals", "collections"]),
  }),
]);

export const Announcement = z
  .object({
    id: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
    message: z.string().trim().min(1).max(180),
    link_label: z.string().trim().min(1).max(40).nullable(),
    destination: AnnouncementDestination.nullable(),
    starts_at: z.iso.datetime({ offset: true }).nullable(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    promotion_id: z.string().trim().min(1).nullable(),
  })
  .superRefine((item, ctx) => {
    if (Boolean(item.destination) !== Boolean(item.link_label)) {
      ctx.addIssue({
        code: "custom",
        path: ["link_label"],
        message: "A link needs both a label and a destination.",
      });
    }
    if (
      item.starts_at &&
      item.ends_at &&
      Date.parse(item.ends_at) <= Date.parse(item.starts_at)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "The end must be after the start.",
      });
    }
  });

export const AnnouncementBar = z
  .object({
    enabled: z.boolean(),
    appearance: z.enum(["light", "dark"]),
    dismissible: z.boolean(),
    /** Array order is the display order; IDs survive edits and reordering. */
    items: z.array(Announcement).max(20),
  })
  .superRefine((bar, ctx) => {
    if (new Set(bar.items.map((item) => item.id)).size !== bar.items.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Announcement IDs must be unique.",
      });
    }
  });

export type Announcement = z.infer<typeof Announcement>;
export type AnnouncementBar = z.infer<typeof AnnouncementBar>;
export type AnnouncementDestination = z.infer<typeof AnnouncementDestination>;

export const EMPTY_ANNOUNCEMENT_BAR: AnnouncementBar = {
  enabled: false,
  appearance: "dark",
  dismissible: true,
  items: [],
};

/** Fail closed if an old or malformed JSON value is encountered. */
export function readAnnouncementBar(value: unknown): AnnouncementBar {
  const parsed = AnnouncementBar.safeParse(value);
  return parsed.success
    ? parsed.data
    : { ...EMPTY_ANNOUNCEMENT_BAR, items: [] };
}

export function announcementStatus(
  item: Announcement,
  now: number,
): "hidden" | "scheduled" | "live" | "ended" {
  if (!item.enabled) return "hidden";
  if (item.ends_at && Date.parse(item.ends_at) <= now) return "ended";
  if (item.starts_at && Date.parse(item.starts_at) > now) return "scheduled";
  return "live";
}

export type AnnouncementPromotion = {
  status?: string;
  code?: string | null;
  is_automatic?: boolean;
  campaign?: {
    starts_at?: string | Date | null;
    ends_at?: string | Date | null;
    budget?: { type?: string; limit?: unknown; used?: unknown } | null;
  } | null;
};

/** Only global eligibility belongs in a public banner; cart rules still apply. */
export function promotionIsAvailable(
  promotion: AnnouncementPromotion,
  now: number,
): boolean {
  if (promotion.status !== "active") return false;
  const campaign = promotion.campaign;
  if (campaign?.starts_at && new Date(campaign.starts_at).getTime() > now)
    return false;
  if (campaign?.ends_at && new Date(campaign.ends_at).getTime() <= now)
    return false;
  const budget = campaign?.budget;
  if (
    budget &&
    (budget.type === "spend" || budget.type === "usage") &&
    budget.limit != null &&
    Number(budget.used ?? 0) >= Number(budget.limit)
  )
    return false;
  return true;
}

export const PublicAnnouncements = z.object({
  appearance: z.enum(["light", "dark"]),
  dismissible: z.boolean(),
  server_time: z.string(),
  /** Clients must stop showing this snapshot after this time, even offline. */
  valid_until: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      link_label: z.string().nullable(),
      href: z.string().nullable(),
      promotion_code: z.string().nullable(),
      ends_at: z.string().nullable(),
    }),
  ),
});
export type PublicAnnouncements = z.infer<typeof PublicAnnouncements>;

export const AnnouncementOptionsQuery = z.object({
  type: z.enum(["collection", "category", "product", "promotion"]),
  q: z.string().trim().max(100).optional(),
  id: z.string().trim().min(1).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AnnouncementOptionsQuery = z.infer<typeof AnnouncementOptionsQuery>;
export const AnnouncementOptionsResponse = z.object({
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  count: z.number(),
  offset: z.number(),
  limit: z.number(),
});
