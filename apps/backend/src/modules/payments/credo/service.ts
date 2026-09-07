import { createHash } from "node:crypto";

import { MedusaError } from "@medusajs/framework/utils";
import type { ProviderWebhookPayload } from "@medusajs/framework/types";

import { RedirectPaymentProvider } from "../shared/redirect-payment-provider";
import type { RedirectProviderDependencies } from "../shared/redirect-payment-provider";
import type {
  InitializedTransaction,
  InitializeTransactionInput,
  NormalizedTransaction,
  NormalizedWebhook,
  RedirectSessionData,
} from "../shared/types";
import { CredoClient, normalizeStatus } from "./client";
import { FeeBearerEnum, type CredoOptions, type PaymentChannel } from "./types";

const DEFAULT_CHANNELS: PaymentChannel[] = ["CARD", "BANK"];

/** Custom field we round-trip the Medusa session id through. */
const SESSION_FIELD = "medusa_session_id";

/** Credo's normalized states, as the actions Medusa acts on. */
const CREDO_STATE_ACTIONS: Record<
  NormalizedTransaction["status"],
  NormalizedWebhook["action"]
> = {
  successful: "captured",
  failed: "failed",
  canceled: "canceled",
  pending: "pending",
};

class CredoPaymentProvider extends RedirectPaymentProvider<CredoOptions> {
  static identifier = "credo";

  private readonly client: CredoClient;

  constructor(container: RedirectProviderDependencies, options: CredoOptions) {
    super(container, options);

    this.client = new CredoClient(options);
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["publicKey", "secretKey"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Credo payment provider requires the "${key}" option.`,
        );
      }
    }

    if (options.mode && !["test", "live"].includes(options.mode as string)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Credo "mode" must be "test" or "live", got "${options.mode}".`,
      );
    }
  }

  protected async initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializedTransaction> {
    const customer = input.context?.customer;
    const email = customer?.email;

    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Credo requires a customer email to initialize a transaction.",
      );
    }

    if (input.currencyCode !== "NGN" && input.currencyCode !== "USD") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Credo only supports NGN and USD, but the region is set to ${input.currencyCode}.`,
      );
    }

    const result = await this.client.initialize({
      amount: input.amountInMinor,
      email,
      customerFirstName: customer?.first_name ?? undefined,
      customerLastName: customer?.last_name ?? undefined,
      customerPhoneNumber: customer?.phone ?? undefined,
      currency: input.currencyCode,
      reference: input.reference,
      callbackUrl: this.options_.callbackUrl,
      channel: this.options_.channels ?? DEFAULT_CHANNELS,
      bearer: this.options_.bearer ?? FeeBearerEnum.Merchant,
      initializeAccount: 0,
      serviceCode: this.options_.serviceCode,
      metadata: {
        // The webhook has to be able to name the Medusa session, and Credo's
        // metadata is a custom-field list rather than a free-form object.
        customFields: [
          {
            variable_name: SESSION_FIELD,
            value: input.sessionId,
            display_name: "Medusa Session ID",
          },
        ],
      },
    });

    return {
      reference: result.reference || input.reference,
      gatewayReference: result.gatewayReference,
      redirectUrl: result.redirectUrl,
    };
  }

  protected async verifyTransaction(
    session: RedirectSessionData,
  ): Promise<NormalizedTransaction> {
    // Credo's docs say to verify by its own reference where one was issued.
    const reference = session.gateway_reference || session.reference;
    const result = await this.client.verify(reference);

    return {
      status: result.state,
      amountInMinor: result.amountInMinor,
      currencyCode: result.currencyCode,
      raw: result.raw,
    };
  }

  protected async refundTransaction(): Promise<Record<string, unknown>> {
    // NOTE: Credo exposes no documented refund endpoint. Rather than guess at
    // one, refunds are surfaced as a manual dashboard action so the admin gets a
    // clear message instead of a silent no-op that leaves the customer unpaid.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Credo refunds must be issued from the Credo dashboard; this provider cannot refund via API.",
    );
  }

  protected async parseWebhook(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<NormalizedWebhook> {
    this.assertSignature(payload);

    const body = (payload.data ?? {}) as Record<string, unknown>;
    const data = (body.data ?? body) as Record<string, unknown>;
    const state = normalizeStatus(data.status);

    return {
      action: CREDO_STATE_ACTIONS[state],
      sessionId: readSessionId(data),
      amountInMinor: typeof data.amount === "number" ? data.amount : undefined,
      currencyCode:
        typeof data.currency === "string" ? data.currency : undefined,
    };
  }

  /**
   * Credo signs webhooks with SHA-512 over the webhook token concatenated with
   * the business code. Both are configuration, not per-request values, so this
   * is a shared-secret check rather than a body signature — it proves the caller
   * is Credo but not that the body is untampered. `verifyTransaction` is what
   * actually decides whether money moved.
   */
  private assertSignature(payload: ProviderWebhookPayload["payload"]): void {
    const { webhookToken, businessCode } = this.options_;

    if (!webhookToken || !businessCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "webhookToken and businessCode must be configured before Credo webhooks can be trusted.",
      );
    }

    const headers = (payload.headers ?? {}) as Record<
      string,
      string | string[]
    >;
    const received = String(
      headers["x-credo-signature"] ?? headers["x-signature"] ?? "",
    );

    if (!received) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Missing X-Credo-Signature header.",
      );
    }

    const expected = createHash("sha512")
      .update(`${webhookToken}${businessCode}`)
      .digest("hex");

    if (received.toLowerCase() !== expected) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "X-Credo-Signature did not match.",
      );
    }
  }
}

function readSessionId(data: Record<string, unknown>): string | undefined {
  const metadata = data.metadata as
    | { customFields?: { variable_name?: string; value?: unknown }[] }
    | undefined;

  const field = metadata?.customFields?.find(
    (entry) => entry.variable_name === SESSION_FIELD,
  );

  return typeof field?.value === "string" ? field.value : undefined;
}

export default CredoPaymentProvider;
