import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { STOREFRONT_SETTINGS_MODULE } from "../modules/storefront-settings";
import type StorefrontSettingsModuleService from "../modules/storefront-settings/service";
import {
  readAnnouncementBar,
  type Announcement,
} from "../modules/storefront-settings/announcements";
import { resolveAnnouncements } from "../modules/storefront-settings/announcement-resolver";
import { updateStorefrontSettingsWorkflow } from "../workflows/update-storefront-settings";

/** Development fixtures only. Existing announcements are never overwritten. */
export async function ensureDemoAnnouncements(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const service: StorefrontSettingsModuleService = container.resolve(
    STOREFRONT_SETTINGS_MODULE,
  );
  const settings = await service.retrieveSettings();
  const existing = readAnnouncementBar(settings.announcement_bar);
  if (existing.items.length || existing.enabled) {
    logger.info(
      "Announcements already configured; skipping demo announcements.",
    );
    return;
  }
  const base: Announcement = {
    id: "demo-announcement-arrivals",
    enabled: true,
    message: "Discover the latest arrivals.",
    link_label: "Shop new arrivals",
    destination: { type: "page", id: "new-arrivals" },
    starts_at: null,
    ends_at: null,
    promotion_id: null,
  };
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  await updateStorefrontSettingsWorkflow(container).run({
    input: {
      announcement_bar: {
        enabled: true,
        appearance: "dark",
        dismissible: true,
        items: [
          base,
          {
            ...base,
            id: "demo-announcement-collections",
            message: "Explore our curated collections.",
            link_label: "Browse collections",
            destination: { type: "page", id: "collections" },
          },
          {
            ...base,
            id: "demo-announcement-draft",
            enabled: false,
            message: "Sample draft — hidden until enabled.",
            destination: null,
            link_label: null,
          },
          {
            ...base,
            id: "demo-announcement-scheduled",
            message: "Take another look at what's new.",
            starts_at: tomorrow,
          },
          {
            ...base,
            id: "demo-announcement-ended",
            message: "Sample ended announcement — hidden from shoppers.",
            ends_at: yesterday,
          },
        ],
      },
    },
  });
  const saved = await service.retrieveSettings();
  const publicResult = await resolveAnnouncements(
    container,
    saved.announcement_bar,
    [],
  );
  if (
    readAnnouncementBar(saved.announcement_bar).items.length !== 5 ||
    publicResult.items.length !== 2
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Announcement seed verification failed.",
    );
  }
  logger.info(
    "Announcements: seeded and verified 2 live, 1 draft, 1 scheduled tomorrow, and 1 ended. No categories or discounts created.",
  );
}

export default async function seedAnnouncements({ container }: ExecArgs) {
  await ensureDemoAnnouncements(container);
}
