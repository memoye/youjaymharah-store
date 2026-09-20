import type { Logger } from "@medusajs/framework/types";
import PaystackPaymentProvider from "../paystack/service";
import CredoPaymentProvider from "../credo/service";
import { createHmac } from "node:crypto";

const session = {
  reference: "ref123",
  gateway_reference: "credo123",
  session_id: "payses_123",
  amount_in_minor: 1000000,
  currency_code: "NGN",
  redirect_url: "https://example.com/pay",
};
const logger = { error: jest.fn() } as unknown as Logger;
const paystack = () =>
  new PaystackPaymentProvider({ logger }, { secretKey: "test" });
const credo = () =>
  new CredoPaymentProvider(
    { logger },
    { secretKey: "test", publicKey: "test", mode: "test" },
  );
const originalFetch = global.fetch;
function gatewayResponse(data: Record<string, unknown>) {
  global.fetch = jest
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ status: true, data })),
    );
}
afterEach(() => {
  global.fetch = originalFetch;
});

describe("verified payments", () => {
  const good = {
    status: "success",
    amount: 1000000,
    currency: "NGN",
    reference: "ref123",
  };
  it("accepts a matching server-verified payment", async () => {
    gatewayResponse(good);
    expect((await paystack().authorizePayment({ data: session })).status).toBe(
      "captured",
    );
  });
  it.each([
    { amount: 1 },
    { currency: "USD" },
    { reference: "another" },
    { amount: undefined },
    { currency: undefined },
    { reference: undefined },
    { amount: -1 },
    { amount: 1.5 },
  ])(
    "rejects mismatched or missing verification fields: %j",
    async (change) => {
      gatewayResponse({ ...good, ...change });
      await expect(
        paystack().authorizePayment({ data: session }),
      ).rejects.toThrow("does not match");
      await expect(
        paystack().capturePayment({ data: session }),
      ).rejects.toThrow("does not match");
    },
  );
  it("does not capture an unpaid transaction", async () => {
    gatewayResponse({ ...good, status: "pending" });
    await expect(paystack().capturePayment({ data: session })).rejects.toThrow(
      "Cannot capture",
    );
  });
  it("reads Credo's documented monetary and business reference fields", async () => {
    gatewayResponse({
      status: 0,
      transAmount: 1000000,
      currencyCode: "NGN",
      businessRef: "ref123",
      transRef: "credo123",
    });
    expect((await credo().authorizePayment({ data: session })).status).toBe(
      "captured",
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("credo123/verify"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it("rejects a Credo transaction for another business reference", async () => {
    gatewayResponse({
      status: 0,
      transAmount: 1000000,
      currencyCode: "NGN",
      businessRef: "another",
    });
    await expect(credo().capturePayment({ data: session })).rejects.toThrow(
      "does not match",
    );
  });
  it.each([1, 2])("does not authorize a refunded Credo transaction (status %s)", async (status) => {
    gatewayResponse({ status, transAmount: 1000000, currencyCode: "NGN", businessRef: "ref123" });
    expect((await credo().authorizePayment({ data: session })).status).toBe("canceled");
  });
  it("validates a Credo body signature and rejects tampered payloads", async () => {
    const data = { event: "transaction.successful", data: { status: 0, transAmount: 1000000, currencyCode: "NGN", metadata: { customFields: [{ variable_name: "medusa_session_id", value: "payses_123" }] } } };
    const rawData = JSON.stringify(data);
    const signature = createHmac("sha512", "test").update(rawData).digest("hex");
    const payload = { data, rawData, headers: { "credo-signature": signature } };
    expect((await credo().getWebhookActionAndData(payload)).action).toBe("captured");
    expect((await credo().getWebhookActionAndData({ ...payload, rawData: `${rawData} ` })).action).toBe("failed");
  });
  it("reinitializes on a currency-only change", async () => {
    gatewayResponse({
      reference: "newref",
      authorization_url: "https://example.com/new",
    });
    const result = await paystack().updatePayment({
      data: { ...session, payer: { email: "buyer@example.com" } },
      amount: 10000,
      currency_code: "USD",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.data?.currency_code).toBe("USD");
  });
});
