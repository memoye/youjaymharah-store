import { openSnapshot, sealSnapshot, snapshotKey } from "../snapshot";

const key = snapshotKey("ab".repeat(32));
it("encrypts snapshots with randomized IVs and binds them to the delivery", () => {
  const payload = { html: "private reset token", to: "buyer@example.com" };
  const first = sealSnapshot(payload, "delivery-one", key);
  expect(first).not.toBe(sealSnapshot(payload, "delivery-one", key));
  expect(first).not.toContain("private reset token");
  expect(openSnapshot(first, "delivery-one", key)).toEqual(payload);
  const truncated = first.split(".");
  truncated[2] = Buffer.from(truncated[2], "base64")
    .subarray(0, 4)
    .toString("base64");
  expect(() => openSnapshot(truncated.join("."), "delivery-one", key)).toThrow(
    "Cannot decrypt",
  );
  expect(() => openSnapshot(first, "delivery-two", key)).toThrow(
    "Cannot decrypt",
  );
  expect(() =>
    openSnapshot(first, "delivery-one", snapshotKey("cd".repeat(32))),
  ).toThrow("Cannot decrypt");
  expect(() => openSnapshot("malformed", "delivery-one", key)).toThrow(
    "Cannot decrypt",
  );
});

it.each([undefined, "", "short", "z".repeat(64)])(
  "rejects invalid encryption configuration",
  (value) => {
    expect(() => snapshotKey(value)).toThrow("EMAIL_DELIVERY_ENCRYPTION_KEY");
  },
);
