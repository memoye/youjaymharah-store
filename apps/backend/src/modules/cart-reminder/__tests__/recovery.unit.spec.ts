import { canRecoverCart, RECOVERY_TTL_MS } from "../recovery-policy";

const now = Date.now();
const reminder = {
  email: "buyer@example.com",
  customer_id: null,
  last_sent_at: new Date(now),
  status: "active",
};
const cart = { email: "buyer@example.com", customer_id: null };
describe("cart recovery credentials", () => {
  it("allows the unchanged, recently reminded cart", () => {
    expect(canRecoverCart(reminder, cart, now)).toBe(true);
  });
  it("expires after seven days, without expiring the separate stop action", () => {
    expect(canRecoverCart(reminder, cart, now + RECOVERY_TTL_MS)).toBe(false);
  });
  it("rejects completed carts and changed email or ownership", () => {
    expect(
      canRecoverCart(reminder, { ...cart, completed_at: new Date() }, now),
    ).toBe(false);
    expect(
      canRecoverCart(reminder, { ...cart, email: "other@example.com" }, now),
    ).toBe(false);
    expect(
      canRecoverCart(reminder, { ...cart, customer_id: "cus_new" }, now),
    ).toBe(false);
  });
  it.each(["stopped", "recovered", "failed"])(
    "rejects %s reminders",
    (status) => {
      expect(canRecoverCart({ ...reminder, status }, cart, now)).toBe(false);
    },
  );
});
