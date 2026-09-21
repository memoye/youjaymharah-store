import { createHmac } from "node:crypto";
import { normalizeResendWebhook, verifyResendWebhook } from "../resend-webhook";

const secretBytes = Buffer.from("test-webhook-signing-secret-32-bytes");
const secret = `whsec_${secretBytes.toString("base64")}`;
const event = () => ({
  type: "contact.updated",
  created_at: new Date().toISOString(),
  data: { id: "contact", email: "buyer@example.com", unsubscribed: true },
});
function sign(body: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  const id = "msg_test";
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${body}`).digest("base64")}`,
  };
}

describe("Resend webhook boundary", () => {
  it("verifies the original bytes with the installed SDK", () => {
    const body = JSON.stringify(event());
    expect(
      verifyResendWebhook(Buffer.from(body), sign(body), secret),
    ).toMatchObject({ action: "unsubscribe", email: "buyer@example.com" });
  });
  it("rejects tampering, wrong secrets and missing headers", () => {
    const body = JSON.stringify(event());
    expect(() => verifyResendWebhook(body + " ", sign(body), secret)).toThrow(
      "signature",
    );
    expect(() =>
      verifyResendWebhook(
        body,
        sign(body),
        `whsec_${Buffer.from("other-secret").toString("base64")}`,
      ),
    ).toThrow("signature");
    expect(() => verifyResendWebhook(body, {}, secret)).toThrow("signature");
  });
  it("rejects stale and future delivery timestamps", () => {
    const body = JSON.stringify(event());
    for (const delta of [-600, 600]) {
      expect(() =>
        verifyResendWebhook(
          body,
          sign(body, String(Math.floor(Date.now() / 1000) + delta)),
          secret,
        ),
      ).toThrow("signature");
    }
  });
  it("ignores provider opt-ins and suppression removals", () => {
    expect(
      normalizeResendWebhook(
        { ...event(), data: { ...event().data, unsubscribed: false } },
        "opt-in",
      ),
    ).toBeNull();
    expect(
      normalizeResendWebhook(
        { ...event(), type: "suppression.removed" },
        "removed",
      ),
    ).toBeNull();
  });
  it("blocks permanent bounces, not temporary delivery failures", () => {
    const bounce = {
      ...event(),
      type: "email.bounced",
      data: { to: ["buyer@example.com"], bounce: { type: "Permanent" } },
    };
    expect(normalizeResendWebhook(bounce, "bounce")?.action).toBe(
      "hard_bounce",
    );
    expect(
      normalizeResendWebhook(
        { ...bounce, data: { ...bounce.data, bounce: { type: "Transient" } } },
        "delay",
      ),
    ).toBeNull();
  });
  it("does not apply an ambiguous multi-recipient bounce to everyone", () => {
    expect(() =>
      normalizeResendWebhook(
        {
          ...event(),
          type: "email.bounced",
          data: {
            to: ["one@example.com", "two@example.com"],
            bounce: { type: "Permanent" },
          },
        },
        "multi",
      ),
    ).toThrow();
  });
  it.each(["email.complained", "email.suppressed"])("accepts %s", (type) => {
    expect(
      normalizeResendWebhook(
        { ...event(), type, data: { to: ["buyer@example.com"] } },
        type,
      )?.email,
    ).toBe("buyer@example.com");
  });
});
