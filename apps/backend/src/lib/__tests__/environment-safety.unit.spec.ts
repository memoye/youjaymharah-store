import {
  developmentEnvironmentWarnings,
  validateProductionEnvironment,
  validateSearchEnvironment,
} from "../environment-safety";

describe("production infrastructure checks", () => {
  it("allows local development without Redis", () => {
    expect(() =>
      validateProductionEnvironment({ NODE_ENV: "development" }),
    ).not.toThrow();
  });
  it("requires Redis in production", () => {
    expect(() =>
      validateProductionEnvironment({ NODE_ENV: "production" }),
    ).toThrow("REDIS_URL");
  });
  it("requires strong authentication secrets", () => {
    expect(() =>
      validateProductionEnvironment({
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost",
        JWT_SECRET: "short",
      }),
    ).toThrow("JWT_SECRET");
  });
  it("requires the email snapshot key before starting production", () => {
    const env = {
      NODE_ENV: "production",
      REDIS_URL: "redis://localhost",
      JWT_SECRET: "j".repeat(32),
      COOKIE_SECRET: "c".repeat(32),
    };
    expect(() => validateProductionEnvironment(env)).toThrow(
      "EMAIL_DELIVERY_ENCRYPTION_KEY",
    );
    expect(() =>
      validateProductionEnvironment({
        ...env,
        EMAIL_DELIVERY_ENCRYPTION_KEY: "ab".repeat(32),
      }),
    ).not.toThrow();
  });
});

describe("developmentEnvironmentWarnings", () => {
  it("warns outside production when the email key is missing or malformed", () => {
    for (const key of [undefined, "", "not-hex", "ab".repeat(31)]) {
      const [warning] = developmentEnvironmentWarnings({
        NODE_ENV: "development",
        EMAIL_DELIVERY_ENCRYPTION_KEY: key,
      });
      expect(warning).toContain("EMAIL_DELIVERY_ENCRYPTION_KEY");
    }
  });

  it("says nothing once the key is valid", () => {
    expect(
      developmentEnvironmentWarnings({
        NODE_ENV: "development",
        EMAIL_DELIVERY_ENCRYPTION_KEY: "ab".repeat(32),
      }),
    ).toEqual([]);
  });

  it("leaves production to the hard check instead of warning", () => {
    expect(developmentEnvironmentWarnings({ NODE_ENV: "production" })).toEqual(
      [],
    );
  });

  it("never echoes the key it rejected", () => {
    const [warning] = developmentEnvironmentWarnings({
      NODE_ENV: "development",
      EMAIL_DELIVERY_ENCRYPTION_KEY: "secret-looking-value",
    });
    expect(warning).not.toContain("secret-looking-value");
  });
});

describe("validateSearchEnvironment", () => {
  it("accepts an unset or empty list", () => {
    expect(() => validateSearchEnvironment({})).not.toThrow();
    expect(() =>
      validateSearchEnvironment({ SEARCH_TRENDING_TERMS: "" }),
    ).not.toThrow();
  });

  it("accepts a well-formed list", () => {
    expect(() =>
      validateSearchEnvironment({ SEARCH_TRENDING_TERMS: '["linen","wool"]' }),
    ).not.toThrow();
  });

  it("refuses a malformed list without echoing it", () => {
    for (const value of ["linen, wool", '["ada@example.com"]']) {
      expect(() =>
        validateSearchEnvironment({ SEARCH_TRENDING_TERMS: value }),
      ).toThrow("SEARCH_TRENDING_TERMS");
      try {
        validateSearchEnvironment({ SEARCH_TRENDING_TERMS: value });
      } catch (error) {
        expect((error as Error).message).not.toContain(value);
      }
    }
  });
});
