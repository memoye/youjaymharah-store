import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  AnnouncementBar,
  announcementStatus,
  promotionIsAvailable,
  readAnnouncementBar,
  type AnnouncementDestination,
  type AnnouncementPromotion,
  type PublicAnnouncements,
} from "./announcements";

const PAGE_PATHS = {
  home: "/",
  "new-arrivals": "/new-arrivals",
  collections: "/collections",
};
const TARGETS = {
  collection: {
    entity: "product_collection",
    path: "/collections/",
    fields: ["id", "handle"],
  },
  category: {
    entity: "product_category",
    path: "/categories/",
    fields: ["id", "handle", "is_active", "is_internal"],
  },
  product: {
    entity: "product",
    path: "/products/",
    fields: ["id", "handle", "status", "sales_channels.id"],
  },
};

export async function resolveAnnouncementDestination(
  container: MedusaContainer,
  destination: AnnouncementDestination,
  salesChannelIds?: string[],
): Promise<string | null> {
  if (destination.type === "page") return PAGE_PATHS[destination.id];
  const target = TARGETS[destination.type];
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: target.entity,
    fields: target.fields,
    filters: { id: destination.id },
  });
  const item = data[0] as
    | {
        handle?: string;
        status?: string;
        is_active?: boolean;
        is_internal?: boolean;
        sales_channels?: { id: string }[];
      }
    | undefined;
  if (!item?.handle) return null;
  if (destination.type === "category" && (!item.is_active || item.is_internal))
    return null;
  if (destination.type === "product") {
    if (item.status !== "published") return null;
    const channels = item.sales_channels ?? [];
    if (
      !channels.length ||
      (salesChannelIds &&
        !channels.some((channel) => salesChannelIds.includes(channel.id)))
    )
      return null;
  }
  return `${target.path}${encodeURIComponent(item.handle)}`;
}

async function readPromotion(
  container: MedusaContainer,
  id: string,
): Promise<AnnouncementPromotion | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "promotion",
    filters: { id },
    fields: [
      "id",
      "status",
      "code",
      "is_automatic",
      "campaign.starts_at",
      "campaign.ends_at",
      "campaign.budget.type",
      "campaign.budget.limit",
      "campaign.budget.used",
    ],
  });
  return (data[0] as AnnouncementPromotion | undefined) ?? null;
}

/** Also called inside the workflow, so scripts cannot bypass validation. */
export async function validateAnnouncementBar(
  container: MedusaContainer,
  value: unknown,
): Promise<AnnouncementBar> {
  const parsed = AnnouncementBar.safeParse(value);
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  await Promise.all(
    parsed.data.items.map(async (item) => {
      if (
        item.destination &&
        !(await resolveAnnouncementDestination(container, item.destination))
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The destination for "${item.message}" is unavailable. Choose a published product, public category, or existing collection.`,
        );
      }
      if (
        item.promotion_id &&
        !(await readPromotion(container, item.promotion_id))
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The related promotion for "${item.message}" no longer exists.`,
        );
      }
    }),
  );
  return parsed.data;
}

/** Public responses contain only live messages; scheduled drafts stay private. */
export async function resolveAnnouncements(
  container: MedusaContainer,
  value: unknown,
  salesChannelIds: string[],
  now = Date.now(),
): Promise<PublicAnnouncements> {
  const bar = readAnnouncementBar(value);
  let validUntil = now + 60_000;
  const noteBoundary = (date: string | Date | null | undefined) => {
    if (!date) return;
    const time = new Date(date).getTime();
    if (time > now) validUntil = Math.min(validUntil, time);
  };
  const items = bar.enabled
    ? await Promise.all(
        bar.items.map(async (item) => {
          if (!item.enabled) return null;
          noteBoundary(item.starts_at);
          noteBoundary(item.ends_at);
          if (announcementStatus(item, now) !== "live") return null;
          let endsAt = item.ends_at;
          let promotionCode: string | null = null;
          if (item.promotion_id) {
            const promotion = await readPromotion(container, item.promotion_id);
            if (!promotion) return null;
            noteBoundary(promotion.campaign?.starts_at);
            noteBoundary(promotion.campaign?.ends_at);
            if (!promotionIsAvailable(promotion, now)) return null;
            const campaignEnd = promotion.campaign?.ends_at;
            if (
              campaignEnd &&
              (!endsAt || new Date(campaignEnd).getTime() < Date.parse(endsAt))
            )
              endsAt = new Date(campaignEnd).toISOString();
            promotionCode = promotion.is_automatic
              ? null
              : (promotion.code ?? null);
          }
          const href = item.destination
            ? await resolveAnnouncementDestination(
                container,
                item.destination,
                salesChannelIds,
              )
            : null;
          if (item.destination && !href) return null;
          return {
            id: item.id,
            message: item.message,
            link_label: item.link_label,
            href,
            promotion_code: promotionCode,
            ends_at: endsAt,
          };
        }),
      )
    : [];
  return {
    appearance: bar.appearance,
    dismissible: bar.dismissible,
    server_time: new Date(now).toISOString(),
    valid_until: new Date(validUntil).toISOString(),
    items: items.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
  };
}
