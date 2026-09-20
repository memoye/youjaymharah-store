export const RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function canRecoverCart(
  reminder: {
    email: string;
    customer_id: string | null;
    last_sent_at: Date | string | null;
    status: string;
  },
  cart: {
    email?: string | null;
    customer_id?: string | null;
    completed_at?: Date | string | null;
  },
  now = Date.now(),
): boolean {
  if (
    !reminder.last_sent_at ||
    cart.completed_at ||
    !["active", "finished"].includes(reminder.status)
  )
    return false;
  const age = now - new Date(reminder.last_sent_at).getTime();
  return (
    Number.isFinite(age) &&
    age >= 0 &&
    age < RECOVERY_TTL_MS &&
    reminder.email.trim().toLowerCase() === cart.email?.trim().toLowerCase() &&
    (reminder.customer_id ?? null) === (cart.customer_id ?? null)
  );
}
