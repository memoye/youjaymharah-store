export type StoreMenuPromoTargetType = "collection" | "category" | "product";

export type StoreMenuPromo = {
  target_type: StoreMenuPromoTargetType;
  target_id: string;
  image_url: string;
  mobile_image_url: string | null;
};

/** Safely reads cards saved before or outside the current admin form. */
export function completeStoreMenuPromos(value: unknown): StoreMenuPromo[] {
  const items =
    value && typeof value === "object"
      ? (value as Record<string, unknown>).items
      : undefined;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 2).flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const promo = item as Record<string, unknown>;
    const targetType = promo.target_type;

    if (
      (targetType !== "collection" &&
        targetType !== "category" &&
        targetType !== "product") ||
      typeof promo.target_id !== "string" ||
      typeof promo.image_url !== "string"
    ) {
      return [];
    }

    return [
      {
        target_type: targetType,
        target_id: promo.target_id,
        image_url: promo.image_url,
        mobile_image_url:
          typeof promo.mobile_image_url === "string"
            ? promo.mobile_image_url
            : null,
      },
    ];
  });
}
