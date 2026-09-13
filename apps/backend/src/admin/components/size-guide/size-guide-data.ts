import { sdk } from "../../lib/sdk";

export type Unit = "cm" | "in";

export type SizeGuideColumn = {
  key: string;
  label: string;
  type: "measurement" | "text";
};

export type SizeGuideCell = number | [number, number] | string | null;

export type SizeGuideTable = {
  columns: SizeGuideColumn[];
  rows: { size: string; values: Record<string, SizeGuideCell> }[];
};

export type AdminSizeGuide = {
  id: string;
  name: string;
  description: string | null;
  diagram_url: string | null;
  table: SizeGuideTable;
  is_default: boolean;
  product_count: number;
  categories: { id: string; name: string }[];
};

export const SIZE_GUIDES_QUERY_KEY = ["size-guides"];

export const SIZE_VALUES_QUERY_KEY = ["size-guides", "size-values"];

export const fetchSizeGuides = () =>
  sdk.client.fetch<{ size_guides: AdminSizeGuide[] }>("/admin/size-guides");

/** The shared Size option's values, in the order set on the option. */
export async function fetchSizeValues(): Promise<string[]> {
  const { product_options } = await sdk.client.fetch<{
    product_options: {
      title: string;
      values?: { value: string; rank?: number | null }[];
    }[];
  }>("/admin/product-options", {
    query: { is_exclusive: false, limit: 50, fields: "id,title,*values" },
  });

  const size = product_options.find((option) => option.title === "Size");

  return [...(size?.values ?? [])]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((value) => value.value);
}

const CM_PER_INCH = 2.54;

/** One decimal place, without a trailing ".0". */
function tidy(value: number): string {
  return String(Number(value.toFixed(1)));
}

/** A stored cm value (or range) as staff type it, in the chosen unit. */
export function formatMeasurement(
  cell: number | [number, number],
  unit: Unit,
): string {
  const show = (cm: number) => tidy(unit === "cm" ? cm : cm / CM_PER_INCH);

  return Array.isArray(cell) ? `${show(cell[0])}-${show(cell[1])}` : show(cell);
}

/**
 * Reads "86", "86.5" or "86-90" in the chosen unit and returns cm. Returns
 * null for an empty cell and undefined for anything unreadable.
 */
export function parseMeasurement(
  text: string,
  unit: Unit,
): number | [number, number] | null | undefined {
  const trimmed = text.trim().replace(/,/g, ".");

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/,
  );

  if (!match) {
    return undefined;
  }

  const toCm = (value: string) =>
    Number(
      (unit === "cm" ? Number(value) : Number(value) * CM_PER_INCH).toFixed(1),
    );

  return match[2] ? [toCm(match[1]), toCm(match[2])] : toCm(match[1]);
}

/** "Inside leg" -> "inside_leg", unique among `taken`. */
export function columnKey(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "c_$1")
      .slice(0, 28) || "column";

  let key = base;
  let suffix = 2;

  while (taken.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }

  return key;
}
