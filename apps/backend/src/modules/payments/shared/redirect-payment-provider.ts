import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
} from "@medusajs/framework/utils";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";

import { fromMinorUnit, toGatewayReference, toMinorUnit } from "./amount";
import type {
  InitializedTransaction,
  InitializeTransactionInput,
  NormalizedTransaction,
  NormalizedWebhook,
  RedirectProviderOptions,
  RedirectSessionData,
} from "./types";

export type RedirectProviderDependencies = {
  logger: Logger;
};

/**
 * Base for hosted-checkout ("redirect") gateways such as Credo and Paystack.
 *
 * The flow these gateways share:
 *
 *   initiatePayment  -> create a transaction, hand the storefront a redirect URL
 *   (customer pays on the gateway's page, then returns to `callbackUrl`)
 *   authorizePayment -> verify the reference server-side; that verify call is
 *                       the source of truth, not the webhook
 *
 * Subclasses supply only the four gateway-specific operations at the bottom.
 */
export abstract class RedirectPaymentProvider<
  TOptions extends RedirectProviderOptions = RedirectProviderOptions,
> extends AbstractPaymentProvider<TOptions> {
  protected readonly logger_: Logger;
  protected readonly options_: TOptions;

  constructor(container: RedirectProviderDependencies, options: TOptions) {
    super(container, options);

    this.logger_ = container.logger;
    this.options_ = options;
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const sessionId = input.data?.session_id as string | undefined;

    if (!sessionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[${this.getIdentifier()}] No session_id was provided when initiating the payment.`,
      );
    }

    const data = await this.createSession({
      sessionId,
      reference: toGatewayReference(sessionId),
      amount: input.amount,
      currencyCode: input.currency_code,
      context: input.context,
      extra: input.data,
    });

    return {
      id: data.reference,
      status: "pending",
      data: data as unknown as Record<string, unknown>,
    };
  }

  /**
   * Re-initializes the transaction when the cart total changes. The gateways
   * reject a reference that has already been used, so a fresh suffix is added.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const session = this.getSessionData(input.data);
    const amountInMinor = toMinorUnit(input.amount, input.currency_code);

    if (session.amount_in_minor === amountInMinor) {
      return {
        data: session as unknown as Record<string, unknown>,
        status: "pending",
      };
    }

    const data = await this.createSession({
      sessionId: session.session_id,
      reference: toGatewayReference(
        session.session_id,
        Date.now().toString(36),
      ),
      amount: input.amount,
      currencyCode: input.currency_code,
      context: input.context,
      extra: input.data,
    });

    return {
      data: data as unknown as Record<string, unknown>,
      status: "pending",
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    return await this.getPaymentStatus(input);
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const session = this.getSessionData(input.data);
    const transaction = await this.verifyTransaction(session);

    return {
      status: this.toSessionStatus(transaction.status),
      data: { ...session, verification: transaction.raw },
    };
  }

  /**
   * Both gateways charge the card on the hosted page, so there is no separate
   * capture step — we re-verify and refuse to report success unless the gateway
   * agrees the money moved.
   */
  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    const session = this.getSessionData(input.data);
    const transaction = await this.verifyTransaction(session);

    if (transaction.status !== "successful") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `[${this.getIdentifier()}] Cannot capture ${session.reference}: gateway reports "${transaction.status}".`,
      );
    }

    return { data: { ...session, verification: transaction.raw } };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = this.getSessionData(input.data);
    const raw = await this.refundTransaction({
      session,
      amountInMinor: toMinorUnit(input.amount, session.currency_code),
    });

    return { data: { ...session, refund: raw } };
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    const session = this.getSessionData(input.data);
    const transaction = await this.verifyTransaction(session);

    return { data: transaction.raw };
  }

  /**
   * Neither gateway can void a hosted session — an unpaid one simply expires —
   * so both of these are passthroughs that keep the stored data intact.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    let parsed: NormalizedWebhook;

    try {
      parsed = await this.parseWebhook(payload);
    } catch (error) {
      this.logger_.error(
        `[${this.getIdentifier()}] Rejected webhook: ${(error as Error).message}`,
      );
      return { action: "failed" };
    }

    if (!parsed.sessionId) {
      // Not every gateway event carries our metadata (settlement notices, for
      // one). Without a session id there is nothing for Medusa to act on.
      return { action: "not_supported" };
    }

    // NOTE: the webhook is a redundancy, not the source of truth. Medusa emits
    // this event through the in-memory event bus with `attempts: 3`, which the
    // local bus ignores — there is no retry, and a restart inside the 5s delay
    // drops the event after we have already ACKed the gateway. The customer's
    // return leg re-runs authorizePayment, which verifies server-side, so a lost
    // webhook self-heals. See the no-Redis stance before "fixing" this with a queue.
    return {
      action: parsed.action,
      data: {
        session_id: parsed.sessionId,
        amount: new BigNumber(
          fromMinorUnit(
            parsed.amountInMinor ?? 0,
            parsed.currencyCode ?? "NGN",
          ),
        ),
      },
    };
  }

  protected async createSession(args: {
    sessionId: string;
    reference: string;
    amount: InitiatePaymentInput["amount"];
    currencyCode: string;
    context?: InitiatePaymentInput["context"];
    extra?: Record<string, unknown>;
  }): Promise<RedirectSessionData> {
    const currencyCode = args.currencyCode.toUpperCase();
    const amountInMinor = toMinorUnit(args.amount, currencyCode);

    const initialized = await this.initializeTransaction({
      reference: args.reference,
      amountInMinor,
      currencyCode,
      sessionId: args.sessionId,
      context: args.context,
      data: args.extra,
    });

    return {
      reference: initialized.reference,
      gateway_reference: initialized.gatewayReference,
      redirect_url: initialized.redirectUrl,
      session_id: args.sessionId,
      amount_in_minor: amountInMinor,
      currency_code: currencyCode,
    };
  }

  protected getSessionData(
    data?: Record<string, unknown>,
  ): RedirectSessionData {
    const session = data as RedirectSessionData | undefined;

    if (!session?.reference) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[${this.getIdentifier()}] The payment session has no gateway reference stored.`,
      );
    }

    return session;
  }

  protected toSessionStatus(
    status: NormalizedTransaction["status"],
  ): PaymentSessionStatus {
    switch (status) {
      case "successful":
        return "captured";
      case "failed":
        return "error";
      case "canceled":
        return "canceled";
      default:
        // The customer has not finished on the hosted page yet. This lets the
        // cart complete into an order with an "awaiting" payment status instead
        // of failing the checkout outright.
        return "pending_authorization";
    }
  }

  /** Create the transaction and return the hosted page to redirect to. */
  protected abstract initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializedTransaction>;

  /** Server-side verification. This is what decides whether money moved. */
  protected abstract verifyTransaction(
    session: RedirectSessionData,
  ): Promise<NormalizedTransaction>;

  protected abstract refundTransaction(args: {
    session: RedirectSessionData;
    amountInMinor: number;
  }): Promise<Record<string, unknown>>;

  /** Verify the signature and map the event. Throw to reject the webhook. */
  protected abstract parseWebhook(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<NormalizedWebhook>;
}
