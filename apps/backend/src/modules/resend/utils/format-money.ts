import type { BigNumberValue } from "@medusajs/framework/types";

/**
 * Formats an amount for an email. Medusa stores amounts as-is (49.99 is 49.99,
 * never 4999), so the value goes to Intl unchanged.
 *
 * query.graph returns amounts as numbers, numeric strings or BigNumber objects
 * depending on the field, hence the normalisation. Returns an empty string for
 * anything that is not a finite number, so a template can test the result.
 */
export function formatMoney(
  amount: BigNumberValue | null | undefined,
  currencyCode: string,
): string {
  const value =
    typeof amount === "number"
      ? amount
      : Number.parseFloat(amount?.toString() ?? "");

  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: currencyCode,
  }).format(value);
}
