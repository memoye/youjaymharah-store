import { formatMoney } from "./format-money";

export type OrderBalance = {
  /** Who owes whom once the change is applied. */
  direction: "customer_owes" | "store_owes" | "settled";
  /** Formatted absolute amount; empty when settled. */
  amount: string;
};

/**
 * Reads an order summary's `pending_difference`, which Medusa computes as the
 * current order total minus everything paid and refunded so far. Positive means
 * the customer owes the store; negative means the store owes the customer.
 *
 * Anything under a hundredth of the currency is rounding, not a balance worth
 * telling a customer about.
 */
export function describeOrderBalance(
  pendingDifference: number | null | undefined,
  currencyCode: string,
): OrderBalance {
  const value = Number(pendingDifference ?? 0);

  if (!Number.isFinite(value) || Math.abs(value) < 0.01) {
    return { direction: "settled", amount: "" };
  }

  return {
    direction: value > 0 ? "customer_owes" : "store_owes",
    amount: formatMoney(Math.abs(value), currencyCode),
  };
}
