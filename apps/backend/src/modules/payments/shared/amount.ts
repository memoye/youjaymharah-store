import { BigNumber, MathBN } from "@medusajs/framework/utils";
import type { BigNumberInput } from "@medusajs/framework/types";

/**
 * Medusa stores prices in the major unit as-is (₦49.99 is 49.99, not 4999),
 * but Credo and Paystack both bill in the minor unit (kobo / cents). These two
 * helpers are the only place that conversion is allowed to happen.
 *
 * Zero-decimal currencies are listed for completeness; NGN and USD are both
 * two-decimal, so in practice the multiplier here is always 100.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function getMultiplier(currencyCode: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase()) ? 1 : 100;
}

/** 49.99 NGN -> 4999 kobo */
export function toMinorUnit(amount: BigNumberInput, currencyCode: string): number {
  const multiplier = getMultiplier(currencyCode);
  const minor = new BigNumber(MathBN.mult(amount, multiplier)).numeric;

  return Math.round(minor);
}

/** 4999 kobo -> 49.99 NGN */
export function fromMinorUnit(amountInMinor: BigNumberInput, currencyCode: string): number {
  const multiplier = getMultiplier(currencyCode);

  return new BigNumber(MathBN.div(amountInMinor, multiplier)).numeric;
}

/**
 * Both gateways reject references containing anything but alphanumerics, and
 * Medusa session ids look like `payses_01K...`. Stripping the separator keeps
 * the mapping deterministic and collision-free (the ULID suffix is unique).
 */
export function toGatewayReference(sessionId: string, suffix?: string): string {
  const base = sessionId.replace(/[^a-zA-Z0-9]/g, "");

  return suffix ? `${base}${suffix.replace(/[^a-zA-Z0-9]/g, "")}` : base;
}
