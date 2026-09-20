import { readAnnouncementBar } from "./announcements";
import { completeStoreMenuPromos } from "./store-menu-promos";

/** Keep admin responses consistent with the editable list contract. */
export function adminSettings<
  T extends { store_menu_cards: unknown; announcement_bar: unknown },
>(settings: T) {
  return {
    ...settings,
    store_menu_cards: completeStoreMenuPromos(settings.store_menu_cards),
    announcement_bar: readAnnouncementBar(settings.announcement_bar),
  };
}
