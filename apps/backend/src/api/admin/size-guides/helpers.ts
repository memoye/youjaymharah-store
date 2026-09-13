import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { SizeGuideTable } from "../../../modules/size-guide/types";

export type AdminSizeGuide = {
  id: string;
  name: string;
  description: string | null;
  diagram_url: string | null;
  table: SizeGuideTable;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  /** How many products use this guide directly (overrides). */
  product_count: number;
  /** Categories that use it as their default. */
  categories: { id: string; name: string }[];
};

type Raw = Omit<AdminSizeGuide, "product_count" | "categories"> & {
  products?: ({ id: string } | null)[];
  product_categories?: ({ id: string; name: string } | null)[];
};

/** Size guides with where they are used, sorted by name. */
export async function listAdminSizeGuides(
  scope: MedusaContainer,
  filters: { id?: string } = {},
): Promise<AdminSizeGuide[]> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "size_guide",
    fields: [
      "id",
      "name",
      "description",
      "diagram_url",
      "table",
      "is_default",
      "created_at",
      "updated_at",
      "products.id",
      "product_categories.id",
      "product_categories.name",
    ],
    filters,
  });

  return (data as unknown as Raw[])
    .map(({ products, product_categories, ...guide }) => ({
      ...guide,
      product_count: (products ?? []).filter(Boolean).length,
      categories: (product_categories ?? [])
        .filter((c): c is { id: string; name: string } => Boolean(c))
        .map((c) => ({ id: c.id, name: c.name })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
