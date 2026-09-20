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
});
