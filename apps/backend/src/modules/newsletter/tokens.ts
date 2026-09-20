import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_COOLDOWN_MS = 60 * 1000;

type Subscriber = {
  id: string;
  token: string;
  status: string;
  consent_at: Date | string | null;
};

export function newsletterLockKey(email: string): string {
  return `newsletter:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
}

export function confirmationToken(subscriber: Subscriber): string {
  const timestamp = subscriber.consent_at
    ? new Date(subscriber.consent_at).getTime()
    : 0;
  const payload = `${subscriber.id}.${timestamp}`;
  const signature = createHmac("sha256", subscriber.token)
    .update(`confirm:${payload}`)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function canConfirm(
  subscriber: Subscriber,
  token: string,
  now = Date.now(),
): boolean {
  if (!subscriber.consent_at || subscriber.status === "unsubscribed")
    return false;
  const age = now - new Date(subscriber.consent_at).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= CONFIRMATION_TTL_MS)
    return false;
  const actual = Buffer.from(token);
  const expected = Buffer.from(confirmationToken(subscriber));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
