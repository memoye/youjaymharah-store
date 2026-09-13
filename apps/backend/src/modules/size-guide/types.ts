/**
 * A size guide is a table. Measurements are always stored in centimetres; the
 * storefront converts to inches for display, and the admin converts inches
 * typed by staff before saving.
 */
export type SizeGuideColumn = {
  /** Stable identifier the rows' values are keyed by, e.g. "bust". */
  key: string;
  /** What shoppers see as the column heading, e.g. "Bust". */
  label: string;
  /** "measurement" cells are cm numbers; "text" cells are shown as typed ("UK 10"). */
  type: "measurement" | "text";
};

/** A cm value, a cm range [min, max], text, or empty. */
export type SizeGuideCell = number | [number, number] | string | null;

export type SizeGuideRow = {
  /** A value of the shared Size option, e.g. "M" or "38". */
  size: string;
  values: Record<string, SizeGuideCell>;
};

export type SizeGuideTable = {
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
};
