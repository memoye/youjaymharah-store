import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { WISHLIST_MODULE } from "../modules/wishlist";
import type WishlistModuleService from "../modules/wishlist/service";
import { deleteGuestWishlistsWorkflow } from "../workflows/wishlist";

/**
 * How long a guest wishlist survives without a save. Matches the storefront's
 * wishlist cookie, which is renewed on every save for the same period, so a
 * list is only deleted once no browser can still point at it.
 */
const STALE_AFTER_DAYS = 90;

const PAGE_SIZE = 500;

/**
 * Deletes guest wishlists nobody has saved to for STALE_AFTER_DAYS. Signed-in
 * customers' lists are never touched.
 */
export default async function deleteStaleGuestWishlists(
  container: MedusaContainer,
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const service: WishlistModuleService = container.resolve(WISHLIST_MODULE);

  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const stale: string[] = [];

  // A list created before the cutoff may still have recent saves, so the
  // items decide. Collected first and deleted after, so deleting does not
  // shift the pages still being read.
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const wishlists = await service.listWishlists(
      { customer_id: null, created_at: { $lt: cutoff } },
      {
        select: ["id", "updated_at"],
        relations: ["items"],
        take: PAGE_SIZE,
        skip,
        order: { created_at: "ASC" },
      },
    );

    for (const wishlist of wishlists) {
      const lastActivity = Math.max(
        new Date(wishlist.updated_at).getTime(),
        ...(wishlist.items ?? []).map((item) =>
          new Date(item.updated_at).getTime(),
        ),
      );

      if (lastActivity < cutoff.getTime()) {
        stale.push(wishlist.id);
      }
    }

    if (wishlists.length < PAGE_SIZE) {
      break;
    }
  }

  for (let i = 0; i < stale.length; i += PAGE_SIZE) {
    await deleteGuestWishlistsWorkflow(container).run({
      input: { ids: stale.slice(i, i + PAGE_SIZE) },
    });
  }

  if (stale.length) {
    logger.info(`Deleted ${stale.length} stale guest wishlists.`);
  }
}

export const config = {
  name: "delete-stale-guest-wishlists",
  schedule: "30 3 * * *", // Daily at 03:30
};
