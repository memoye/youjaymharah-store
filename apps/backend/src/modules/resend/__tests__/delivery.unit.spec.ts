import type { Logger } from "@medusajs/framework/types";
import ResendNotificationProviderService from "../service";
import { emailIdempotency } from "../idempotency";

jest.mock("../emails", () => ({
  resolveEmailTemplate: jest.fn(() => undefined),
}));

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
it("sends the same provider idempotency key on retries and keeps Reply-To separate", async () => {
  global.fetch = jest
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ id: "email_1" })),
    );
  const provider = new ResendNotificationProviderService(
    { logger: { error: jest.fn() } as unknown as Logger },
    { api_key: "re_test", from: "verified@example.com" },
  );
  const notification = {
    to: "buyer@example.com",
    channel: "email",
    template: "inline-test",
    content: { html: "Hello", subject: "Test" },
    data: { reply_to: "support@example.com" },
    ...emailIdempotency("order:123"),
  };
  await provider.send(notification);
  await provider.send(notification);
  const calls = (global.fetch as jest.Mock).mock.calls;
  for (const [, options] of calls) {
    expect(new Headers(options.headers).get("Idempotency-Key")).toBe(
      notification.provider_data.idempotency_key,
    );
    expect(JSON.parse(options.body)).toMatchObject({
      from: "verified@example.com",
      reply_to: "support@example.com",
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  }
});

it("separates retry bookkeeping from the stable provider delivery identity", () => {
  const first = emailIdempotency("alert:123", 0);
  const retry = emailIdempotency("alert:123", 1);
  expect(first.idempotency_key).not.toBe(retry.idempotency_key);
  expect(first.provider_data).toEqual(retry.provider_data);
  expect(emailIdempotency("order:123").idempotency_key).toBeUndefined();
});
