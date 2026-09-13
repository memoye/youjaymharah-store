import type { StoreSizeGuide } from "@youjaymharah/api-types";

export type MeasurementUnit = "cm" | "in";

type Column = StoreSizeGuide["columns"][number];
type Row = StoreSizeGuide["rows"][number];

const CM_PER_INCH = 2.54;

/** cm to one decimal place; inches to the nearest half inch, as clothing labels do. */
function formatNumber(cm: number, unit: MeasurementUnit): string {
  if (unit === "cm") {
    return String(Number(cm.toFixed(1)));
  }

  return String(Math.round((cm / CM_PER_INCH) * 2) / 2);
}

function isRange(cell: unknown): cell is [number, number] {
  return (
    Array.isArray(cell) &&
    cell.length === 2 &&
    typeof cell[0] === "number" &&
    typeof cell[1] === "number"
  );
}

/**
 * A cell as shoppers read it. Guides store measurements in cm, as a number or
 * a [min, max] range; text columns (e.g. "UK size") are shown as typed. Empty
 * or unreadable cells show a dash.
 *
 * The generated API types describe cells as `unknown`, so each shape is
 * checked here rather than trusted.
 */
export function formatSizeGuideCell(
  column: Column,
  cell: unknown,
  unit: MeasurementUnit,
): string {
  if (typeof cell === "string") {
    return cell.trim() || "–";
  }

  if (column.type === "text") {
    return typeof cell === "number" ? String(cell) : "–";
  }

  if (typeof cell === "number") {
    return formatNumber(cell, unit);
  }

  if (isRange(cell)) {
    return `${formatNumber(cell[0], unit)}–${formatNumber(cell[1], unit)}`;
  }

  return "–";
}

/** "Bust (cm)" for measurements, the label alone for text columns. */
export function sizeGuideColumnHeading(
  column: Column,
  unit: MeasurementUnit,
): string {
  return column.type === "measurement"
    ? `${column.label} (${unit})`
    : column.label;
}

/**
 * The row for the size the shopper has chosen, to highlight it. Rows use the
 * same values as the shared Size option, so a variant's size matches exactly.
 */
export function findSizeGuideRow(
  guide: StoreSizeGuide,
  size: string | null | undefined,
): Row | null {
  return size ? (guide.rows.find((row) => row.size === size) ?? null) : null;
}
