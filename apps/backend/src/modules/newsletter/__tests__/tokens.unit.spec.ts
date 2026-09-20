import { canConfirm, confirmationToken, CONFIRMATION_TTL_MS } from "../tokens";

const now = Date.now();
const subscriber = {
  id: "nlsub_test",
  token: "a".repeat(64),
  status: "pending",
  consent_at: new Date(now),
};
describe("newsletter confirmation credentials", () => {
  it("accepts a fresh confirmation but not the unsubscribe credential", () => {
    expect(canConfirm(subscriber, confirmationToken(subscriber), now)).toBe(
      true,
    );
    expect(canConfirm(subscriber, subscriber.token, now)).toBe(false);
  });
  it("cannot resubscribe someone who opted out", () => {
    expect(
      canConfirm(
        { ...subscriber, status: "unsubscribed" },
        confirmationToken(subscriber),
        now,
      ),
    ).toBe(false);
  });
  it("expires at 24 hours and rejects future timestamps", () => {
    const token = confirmationToken(subscriber);
    expect(canConfirm(subscriber, token, now + CONFIRMATION_TTL_MS)).toBe(
      false,
    );
    expect(canConfirm(subscriber, token, now - 1)).toBe(false);
  });
  it("rejects a forged signature and an old signup's credential", () => {
    const token = confirmationToken(subscriber);
    expect(canConfirm(subscriber, token + "x", now)).toBe(false);
    expect(
      canConfirm({ ...subscriber, token: "b".repeat(64) }, token, now),
    ).toBe(false);
    expect(canConfirm({ ...subscriber, id: "nlsub_other" }, token, now)).toBe(
      false,
    );
  });
});
