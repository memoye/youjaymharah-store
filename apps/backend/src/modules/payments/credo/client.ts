import { MedusaError } from "@medusajs/framework/utils";

import type { CredoEnvelope, CredoInitializePayload, CredoOptions } from "./types";

const LIVE_BASE_URL = "https://api.credocentral.com";
const TEST_BASE_URL = "https://api.credodemo.com";

/**
 * Field names Credo has used for the hosted checkout URL across SDK versions.
 * The first one present wins; if none match we throw with the keys we did get,
 * so the very first sandbox call tells us the right name instead of failing
 * somewhere further down the checkout.
 */
const REDIRECT_URL_KEYS = [
  "authorizationUrl",
  "authorization_url",
  "checkoutUrl",
  "checkout_url",
  "paymentUrl",
  "url",
];

const GATEWAY_REFERENCE_KEYS = ["credoReference", "transRef", "reference"];

/**
 * Credo's transaction status codes.
 * https://docs.credocentral.com/docs/concepts#transaction-statuses
 *
 * Refunded (1) and Refund (2) map to `successful` on purpose: the customer's
 * money did move, and Medusa tracks refunded amounts on the Payment record
 * rather than the session, so collapsing them into `failed` would wrongly
 * present a paid-then-refunded order as never paid.
 *
 * Review (6) stays `pending` — flagged for manual review is not yet money.
 */
const STATUS_CODES: Record<string, CredoTransactionState> = {
  "0": "successful",  // Successful   — payment completed successfully
  "1": "successful",  // Refunded     — transaction has been refunded
  "2": "successful",  // Refund       — queued for refund
  "3": "failed",      // Failed       — payment failed
  "4": "successful",  // Settle       — queued for settlement
  "5": "successful",  // Settled      — funds have been paid out
  "6": "pending",     // Review       — flagged for manual review
  "7": "failed",      // Declined     — failed fraud check
  "9": "canceled",    // Cancelled    — by customer
  "10": "canceled",   // Cancelled    — by merchant
  "12": "pending",    // Attempted    — account generated, awaiting credit
  "13": "pending",    // Attempted    — customer attempted payment
  "14": "pending",    // Initialized  — payment page loaded
  "15": "pending",    // Initializing — payment URL generated
};

/** Accepted alongside the codes in case a payload carries the label instead. */
const STATUS_LABELS: Record<string, CredoTransactionState> = {
  successful: "successful",
  success: "successful",
  refunded: "successful",
  refund: "successful",
  settle: "successful",
  settled: "successful",
  failed: "failed",
  declined: "failed",
  cancelled: "canceled",
  canceled: "canceled",
  review: "pending",
  attempted: "pending",
  initialized: "pending",
  initializing: "pending",
};

export type CredoTransactionState = "pending" | "successful" | "failed" | "canceled";

export class CredoClient {
  private readonly baseUrl: string;

  constructor(private readonly options: CredoOptions) {
    this.baseUrl = options.mode === "live" ? LIVE_BASE_URL : TEST_BASE_URL;
  }

  get isLive(): boolean {
    return this.options.mode === "live";
  }

  async initialize(payload: CredoInitializePayload): Promise<{
    reference: string;
    gatewayReference?: string;
    redirectUrl: string;
    raw: Record<string, unknown>;
  }> {
    // Credo authenticates initialization with the PUBLIC key, and there is no
    // `Bearer` prefix on either key.
    const body = await this.request<Record<string, unknown>>(
      "POST",
      "/transaction/initialize",
      this.options.publicKey,
      payload
    );

    const redirectUrl = pick(body, REDIRECT_URL_KEYS);

    if (!redirectUrl) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Credo did not return a checkout URL. Keys received: ${Object.keys(body).join(", ") || "none"}`
      );
    }

    return {
      reference: (payload.reference ?? pick(body, ["reference"]) ?? "") as string,
      gatewayReference: pick(body, GATEWAY_REFERENCE_KEYS),
      redirectUrl,
      raw: body,
    };
  }

  async verify(reference: string): Promise<{
    state: CredoTransactionState;
    amountInMinor?: number;
    currencyCode?: string;
    raw: Record<string, unknown>;
  }> {
    // Verification uses the SECRET key.
    const body = await this.request<Record<string, unknown>>(
      "GET",
      `/transaction/${encodeURIComponent(reference)}/verify`,
      this.options.secretKey
    );

    return {
      state: normalizeStatus(body.status),
      amountInMinor: toNumber(body.amount ?? body.transAmount),
      currencyCode: typeof body.currency === "string" ? body.currency : undefined,
      raw: body,
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    authKey: string,
    body?: unknown
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          // No `Bearer` prefix — Credo takes the raw key.
          Authorization: authKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not reach Credo at ${this.baseUrl}${path}: ${(error as Error).message}`
      );
    }

    const text = await response.text();
    let envelope: CredoEnvelope<T>;

    try {
      envelope = text ? JSON.parse(text) : {};
    } catch {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Credo returned a non-JSON response (${response.status}): ${text.slice(0, 200)}`
      );
    }

    if (!response.ok || (envelope.status !== undefined && Number(envelope.status) >= 400)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Credo ${method} ${path} failed (${response.status}): ${envelope.message ?? text.slice(0, 200)}`
      );
    }

    return (envelope.data ?? {}) as T;
  }
}

function pick(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Maps a Credo status code (or label) onto a gateway-agnostic state.
 *
 * An unrecognized value stays `pending`, which is the safe direction: Medusa
 * keeps the order awaiting payment rather than releasing goods on a status we
 * could not read.
 */
export function normalizeStatus(status: unknown): CredoTransactionState {
  const normalized = String(status ?? "").trim().toLowerCase();

  return STATUS_CODES[normalized] ?? STATUS_LABELS[normalized] ?? "pending";
}
