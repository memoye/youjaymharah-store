import { rateLimit } from "../rate-limit";

describe("public request throttling", () => {
  it("enforces the shared limit across concurrent requests", async () => {
    const entries = new Map();
    let queue = Promise.resolve();
    const cache = {
      get: async ({ key }) => entries.get(key),
      set: async ({ key, data }) => entries.set(key, data),
    };
    const locking = {
      execute: (_key, job) => {
        const result = queue.then(job);
        queue = result.then(() => undefined);
        return result;
      },
    };
    const req = {
      ip: "192.0.2.1",
      scope: { resolve: (key) => (key === "locking" ? locking : cache) },
    } as any;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();
    const middleware = rateLimit("signup", 5);
    await Promise.all(
      Array.from({ length: 12 }, () => middleware(req, res, next)),
    );
    expect(next).toHaveBeenCalledTimes(5);
    expect(res.status).toHaveBeenCalledTimes(7);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(String),
    );
  });
  it("fails closed if shared storage is unavailable", async () => {
    const req = {
      ip: "192.0.2.1",
      scope: {
        resolve: () => {
          throw new Error("unavailable");
        },
      },
    } as any;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();
    await rateLimit("signup", 5)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
