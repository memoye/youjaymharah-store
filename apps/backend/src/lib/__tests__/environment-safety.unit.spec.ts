import { validateProductionEnvironment } from "../production-safety";

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
