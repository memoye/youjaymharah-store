import type { MedusaRequest } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import * as Sentry from "@sentry/node";

/** Errors Medusa answers with a 4xx: the caller's problem, not an incident. */
const EXPECTED_TYPES = new Set([
  MedusaError.Types.CONFLICT,
  MedusaError.Types.UNAUTHORIZED,
  MedusaError.Types.FORBIDDEN,
  MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
  MedusaError.Types.DUPLICATE_ERROR,
  MedusaError.Types.NOT_ALLOWED,
  MedusaError.Types.INVALID_DATA,
  MedusaError.Types.NOT_FOUND,
  MedusaError.Types.INVALID_ARGUMENT,
]);

/**
 * Reports a request that failed with a 5xx. Query strings are dropped rather
 * than sent: a search term is a shopper's words, and `?token=` appears on the
 * newsletter and cart-reminder routes.
 */
export function reportRequestError(error: unknown, req: MedusaRequest) {
  const type = (error as { type?: string })?.type;

  if (type && EXPECTED_TYPES.has(type)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTransactionName(`${req.method} ${req.path}`);
    scope.setContext("request", { method: req.method, path: req.path });
    Sentry.captureException(error);
  });
}
