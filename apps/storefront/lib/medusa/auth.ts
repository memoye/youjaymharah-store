import "server-only";

import { FetchError } from "@medusajs/js-sdk";

import { sdk } from "./server";
import { clearCartId, getCartId, setAuthToken } from "./session";

/**
 * Finishes any sign-in: stores the customer's token, then hands a guest cart
 * to the customer so items added before signing in are kept.
 *
 * A cart that cannot be transferred (completed, deleted, or already another
 * customer's) is dropped rather than kept, so nobody carries on editing a cart
 * that is not theirs. Signing in still succeeds.
 */
export async function completeSignIn(token: string): Promise<void> {
  await setAuthToken(token);

  const cartId = await getCartId();

  if (!cartId) {
    return;
  }

  try {
    await sdk.store.cart.transferCart(
      cartId,
      {},
      { authorization: `Bearer ${token}` },
    );
  } catch {
    await clearCartId();
  }
}

/**
 * Login, registration and OAuth callbacks can answer with an extra step
 * (email verification, MFA) instead of a token. None is switched on for this
 * store yet, so the storefront reports it rather than handling it.
 */
export function extraStepRequired(): Response {
  return Response.json(
    { message: "This account needs an extra step to sign in." },
    { status: 403 },
  );
}

/**
 * Passes Medusa's own client errors (wrong password, email already registered)
 * through, and hides anything else behind a generic message.
 */
export function authFailure(error: unknown, fallback: string): Response {
  if (
    error instanceof FetchError &&
    error.status !== undefined &&
    error.status < 500
  ) {
    return Response.json(
      { message: error.message || fallback },
      { status: error.status },
    );
  }

  console.error(fallback, error);

  return Response.json({ message: fallback }, { status: 502 });
}
