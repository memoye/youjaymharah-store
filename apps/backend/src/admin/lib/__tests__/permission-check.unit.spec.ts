import {
  permissionCheckForQuery,
  buildPermissionCheck,
} from "../permission-check";

describe("buildPermissionCheck", () => {
  it("allows exactly what was granted", () => {
    const can = buildPermissionCheck([
      "product:read",
      "product:update",
      "cart_reminder:read",
    ]);

    expect(can("product", "read")).toBe(true);
    expect(can("product", "update")).toBe(true);
    expect(can("cart_reminder", "read")).toBe(true);
  });

  it("refuses anything else", () => {
    const can = buildPermissionCheck(["product:read"]);

    expect(can("product", "delete")).toBe(false);
    expect(can("cart_reminder", "read")).toBe(false);
    expect(can("product", "")).toBe(false);
  });

  it("does not confuse resources that share a prefix", () => {
    const can = buildPermissionCheck(["product:update"]);

    expect(can("product_category", "update")).toBe(false);
    expect(can("product_option_value", "update")).toBe(false);
  });

  it("honours wildcards, in case a role is granted one", () => {
    expect(buildPermissionCheck(["product:*"])("product", "delete")).toBe(true);
    expect(buildPermissionCheck(["*:read"])("order", "read")).toBe(true);
    expect(buildPermissionCheck(["*:read"])("order", "update")).toBe(false);
    expect(buildPermissionCheck(["*:*"])("anything", "delete")).toBe(true);
  });

  it("refuses everything while the list is missing or empty", () => {
    for (const permissions of [undefined, null, []]) {
      expect(buildPermissionCheck(permissions)("product", "read")).toBe(false);
    }
  });

  it("denies even previously cached grants when permissions can't be read", () => {
    expect(permissionCheckForQuery(["*:*"], true)("product", "delete")).toBe(
      false,
    );
  });
});
