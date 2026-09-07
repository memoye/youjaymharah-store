import type { RedirectProviderOptions } from "../shared/types";

/**
 * Request types mirror github.com/memoye/credo-types. Response types are
 * modelled from Credo's PHP SDK and normalized defensively in `client.ts`,
 * since the public reference pages are currently unreachable.
 */

export const FeeBearerEnum = {
  Customer: 0,
  Merchant: 1,
} as const;

export type FeeBearer = (typeof FeeBearerEnum)[keyof typeof FeeBearerEnum];

export type CredoCurrency = "NGN" | "USD";

export type PaymentChannel = "CARD" | "BANK";

export type CredoMetaData = {
  customFields?: {
    variable_name: string;
    value: unknown;
    display_name: string;
  }[];
};

export type CredoInitializePayload = {
  amount: number;
  email: string;
  customerPhoneNumber?: string;
  customerFirstName?: string;
  customerLastName?: string;
  currency: CredoCurrency;
  reference?: string;
  callbackUrl?: string;
  channel: PaymentChannel[];
  bearer: FeeBearer;
  metadata?: CredoMetaData;
  narration?: string;
  initializeAccount: 0 | 1;
  pauseSettlement?: 0 | 1;
  pauseSettlementDate?: string;
  serviceCode?: string;
};

export type CredoEnvelope<T = Record<string, unknown>> = {
  status?: number | string;
  message?: string;
  error?: unknown;
  data?: T;
};

export type CredoOptions = RedirectProviderOptions & {
  /** Public key (`0PUB...`), used to initialize transactions. */
  publicKey: string;
  /** Secret key, used to verify transactions server-side. */
  secretKey: string;
  /** `test` targets api.credodemo.com, `live` targets api.credocentral.com. */
  mode?: "test" | "live";
  /** The token you registered with the webhook URL on the Credo dashboard. */
  webhookToken?: string;
  /** Your Credo business code, hashed together with the token. */
  businessCode?: string;
  /** Defaults to every channel Credo supports. */
  channels?: PaymentChannel[];
  /** Who pays Credo's fee. Defaults to the merchant. */
  bearer?: FeeBearer;
  /** Pre-configured split settlement code from the dashboard, if you use one. */
  serviceCode?: string;
};
