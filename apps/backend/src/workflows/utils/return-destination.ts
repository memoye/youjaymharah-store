import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import type { ReturnDestination } from "../../modules/resend/emails/components/return-destination";

/**
 * Where a customer sends returned items: the return's stock location, with its
 * address flattened into display lines. Null when there is no location, or the
 * location has since been deleted.
 */
export async function resolveReturnDestination(
  container: MedusaContainer,
  locationId: string | null | undefined,
): Promise<ReturnDestination | null> {
  if (!locationId) {
    return null;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [location],
  } = await query.graph({
    entity: "stock_location",
    fields: [
      "id",
      "name",
      "address.address_1",
      "address.address_2",
      "address.city",
      "address.province",
      "address.postal_code",
      "address.country_code",
    ],
    filters: { id: locationId },
  });

  if (!location) {
    return null;
  }

  const address = location.address;

  return {
    name: location.name,
    address_lines: [
      address?.address_1,
      address?.address_2,
      [address?.city, address?.province].filter(Boolean).join(", "),
      address?.postal_code,
      address?.country_code?.toUpperCase(),
    ].filter((line): line is string => Boolean(line)),
  };
}
