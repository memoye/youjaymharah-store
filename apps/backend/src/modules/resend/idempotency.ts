import { createHash } from "node:crypto";

export function emailIdempotency(key: string, attempt?: number) {
  const idempotencyKey = `email:${createHash("sha256").update(key).digest("hex")}`;
  // Medusa 2.19 reuses a failed key but generates a new, unpersisted record ID.
  // Keep provider deduplication stable without reusing that failed DB record.
  return {
    ...(attempt === undefined
      ? {}
      : { idempotency_key: `${idempotencyKey}:${attempt}` }),
    provider_data: { idempotency_key: idempotencyKey },
  };
}
