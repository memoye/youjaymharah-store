import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SIZE_GUIDE_MODULE } from "../../modules/size-guide";
import type SizeGuideModuleService from "../../modules/size-guide/service";
import type { SizeGuideTable } from "../../modules/size-guide/types";

/** The shared product option whose values a guide's rows must use. */
export const SIZE_OPTION_TITLE = "Size";

export type SizeGuideRecord = {
  id: string;
  name: string;
  description: string | null;
  diagram_url: string | null;
  table: SizeGuideTable;
  is_default: boolean;
};

/** What the storefront receives. Measurements are in cm. */
export type StoreSizeGuide = {
  id: string;
  name: string;
  description: string | null;
  diagram_url: string | null;
  unit: "cm";
  columns: SizeGuideTable["columns"];
  rows: SizeGuideTable["rows"];
};

export type SizeGuideSource = "product" | "category" | "default";

export type ResolvedSizeGuide = {
  size_guide: SizeGuideRecord | null;
  source: SizeGuideSource | null;
  /** The category the guide came from, when `source` is "category". */
  category: { id: string; name: string } | null;
};

export function toStoreSizeGuide(record: SizeGuideRecord): StoreSizeGuide {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    diagram_url: record.diagram_url,
    unit: "cm",
    columns: record.table.columns,
    rows: record.table.rows,
  };
}

function toRecord(value: unknown): SizeGuideRecord | null {
  const guide = value as Partial<SizeGuideRecord> | null | undefined;

  if (!guide?.id || !guide.table) {
    return null;
  }

  return {
    id: guide.id,
    name: guide.name ?? "",
    description: guide.description ?? null,
    diagram_url: guide.diagram_url ?? null,
    table: guide.table as SizeGuideTable,
    is_default: Boolean(guide.is_default),
  };
}

type CategoryPath = { id: string; name: string; mpath: string | null };

const GUIDE_FIELDS = [
  "size_guide.id",
  "size_guide.name",
  "size_guide.description",
  "size_guide.diagram_url",
  "size_guide.table",
  "size_guide.is_default",
];

/**
 * The nearest guide up the category tree. A category's `mpath` is the chain
 * of IDs from the root down to itself ("root.parent.child"), so every
 * ancestor is known without walking the tree. The deepest category is tried
 * first, and within it the nearest ancestor wins.
 */
export async function findCategorySizeGuide(
  container: MedusaContainer,
  categories: CategoryPath[],
  { excludeSelf = false }: { excludeSelf?: boolean } = {},
): Promise<{
  size_guide: SizeGuideRecord;
  category: { id: string; name: string };
} | null> {
  const chains = categories
    .map((category) => {
      const ids = (category.mpath ?? category.id).split(".").filter(Boolean);
      return (excludeSelf ? ids.slice(0, -1) : ids).reverse();
    })
    .sort((a, b) => b.length - a.length);

  const ancestorIds = [...new Set(chains.flat())];

  if (!ancestorIds.length) {
    return null;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", ...GUIDE_FIELDS],
    filters: { id: ancestorIds },
  });

  const byId = new Map(
    (
      data as unknown as { id: string; name: string; size_guide?: unknown }[]
    ).map((category) => [category.id, category]),
  );

  for (const chain of chains) {
    for (const id of chain) {
      const category = byId.get(id);
      const guide = toRecord(category?.size_guide);

      if (category && guide) {
        return {
          size_guide: guide,
          category: { id: category.id, name: category.name },
        };
      }
    }
  }

  return null;
}

export async function retrieveDefaultSizeGuide(
  container: MedusaContainer,
): Promise<SizeGuideRecord | null> {
  const service: SizeGuideModuleService = container.resolve(SIZE_GUIDE_MODULE);
  const [guide] = await service.listSizeGuides({ is_default: true });

  return toRecord(guide);
}

/**
 * The guide a product shows: its own, else its categories' nearest, else the
 * store default. `product` is null when the product does not exist.
 */
export async function resolveProductSizeGuide(
  container: MedusaContainer,
  productId: string,
): Promise<
  ResolvedSizeGuide & {
    product: { id: string; status: string } | null;
    own_size_guide_id: string | null;
  }
> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [found],
  } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "status",
      ...GUIDE_FIELDS,
      "categories.id",
      "categories.name",
      "categories.mpath",
    ],
    filters: { id: productId },
  });

  const product = found as unknown as
    | {
        id: string;
        status: string;
        size_guide?: unknown;
        categories?: (CategoryPath | null)[];
      }
    | undefined;

  if (!product) {
    return {
      product: null,
      own_size_guide_id: null,
      size_guide: null,
      source: null,
      category: null,
    };
  }

  const base = {
    product: { id: product.id, status: product.status },
    own_size_guide_id: toRecord(product.size_guide)?.id ?? null,
  };

  const own = toRecord(product.size_guide);

  if (own) {
    return { ...base, size_guide: own, source: "product", category: null };
  }

  const fromCategory = await findCategorySizeGuide(
    container,
    (product.categories ?? []).filter((c): c is CategoryPath => Boolean(c)),
  );

  if (fromCategory) {
    return { ...base, ...fromCategory, source: "category" };
  }

  const fallback = await retrieveDefaultSizeGuide(container);

  return {
    ...base,
    size_guide: fallback,
    source: fallback ? "default" : null,
    category: null,
  };
}

/**
 * Problems a table's own contents can have, independent of the catalogue.
 * Messages are written for the person editing the guide.
 */
export function describeTableProblems(table: SizeGuideTable): string[] {
  const problems: string[] = [];
  const columns = new Map<string, SizeGuideTable["columns"][number]>();

  for (const column of table.columns) {
    if (columns.has(column.key)) {
      problems.push(`The column "${column.label}" appears twice.`);
    }
    columns.set(column.key, column);
  }

  const sizes = new Set<string>();

  for (const row of table.rows) {
    if (sizes.has(row.size)) {
      problems.push(`Size ${row.size} has more than one row.`);
    }
    sizes.add(row.size);

    for (const [key, cell] of Object.entries(row.values)) {
      const column = columns.get(key);

      if (!column) {
        problems.push(
          `Size ${row.size} has a value for a column that does not exist.`,
        );
        continue;
      }

      if (cell === null) {
        continue;
      }

      if (column.type === "text" && typeof cell !== "string") {
        problems.push(`${column.label} for size ${row.size} should be text.`);
      }

      if (column.type === "measurement") {
        if (typeof cell === "string") {
          problems.push(
            `${column.label} for size ${row.size} should be a measurement, like 86 or 86-90.`,
          );
        } else if (Array.isArray(cell) && cell[0] > cell[1]) {
          problems.push(
            `${column.label} for size ${row.size}: the range starts above where it ends.`,
          );
        }
      }
    }
  }

  return problems;
}

/** Clears the store-default flag from every guide but `exceptId`; returns the IDs it cleared. */
export async function unsetDefaultSizeGuides(
  service: SizeGuideModuleService,
  exceptId?: string,
): Promise<string[]> {
  const defaults = await service.listSizeGuides(
    { is_default: true },
    { select: ["id"] },
  );

  const ids = defaults.map((guide) => guide.id).filter((id) => id !== exceptId);

  if (ids.length) {
    await service.updateSizeGuides(
      ids.map((id) => ({ id, is_default: false })),
    );
  }

  return ids;
}
