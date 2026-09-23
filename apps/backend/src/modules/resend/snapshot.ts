import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { MedusaError } from "@medusajs/framework/utils";

export function snapshotKey(value: unknown): Buffer {
  if (typeof value !== "string" || !/^[a-f\d]{64}$/i.test(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "EMAIL_DELIVERY_ENCRYPTION_KEY must contain 64 hexadecimal characters (32 random bytes).",
    );
  }
  return Buffer.from(value, "hex");
}

export function sealSnapshot(
  payload: unknown,
  id: string,
  key: Buffer,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function openSnapshot<T>(value: string, id: string, key: Buffer): T {
  try {
    const [version, iv, tag, ciphertext, extra] = value.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext || extra !== undefined)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid email snapshot envelope.",
      );
    const ivBytes = Buffer.from(iv, "base64");
    const tagBytes = Buffer.from(tag, "base64");
    if (ivBytes.length !== 12 || tagBytes.length !== 16)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid email snapshot authentication data.",
      );
    const decipher = createDecipheriv("aes-256-gcm", key, ivBytes, {
      authTagLength: 16,
    });
    decipher.setAAD(Buffer.from(id));
    decipher.setAuthTag(tagBytes);
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Cannot decrypt the saved email snapshot. Restore the correct encryption key; do not recreate the delivery.",
    );
  }
}
