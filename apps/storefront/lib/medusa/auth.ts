import "server-only"

import { FetchError } from "@medusajs/js-sdk"
import type { StoreWishlistResponse } from "@youjaymharah/api-types"

import { isNotFound } from "./errors"
import { sdk } from "./server"
import {
  clearCartId,
  clearWishlistId,
  getCartId,
  getWishlistId,
  setAuthToken,
} from "./session"

/**
 * Finishes any sign-in: stores the customer's token, then hands what the
 * shopper built up as a guest -- cart and wishlist -- to the customer.
 * Signing in succeeds even when either handover fails.
 */
export async function completeSignIn(token: string): Promise<void> {
  await setAuthToken(token)

  const authorization = `Bearer ${token}`

  await Promise.all([
    transferGuestCart(authorization),
    mergeGuestWishlist(authorization),
  ])
}

/**
 * A cart that cannot be transferred (completed, deleted, or already another
 * customer's) is dropped rather than kept, so nobody carries on editing a cart
 * that is not theirs.
 */
async function transferGuestCart(authorization: string): Promise<void> {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  try {
    await sdk.store.cart.transferCart(cartId, {}, { authorization })
  } catch {
    await clearCartId()
  }
}

/**
 * The cookie goes whatever happens: once signed in, the proxy uses the
 * customer's own list, so a guest list left in the cookie would sit unseen and
 * resurface for whoever uses this browser after they sign out.
 */
async function mergeGuestWishlist(authorization: string): Promise<void> {
  const wishlistId = await getWishlistId()

  if (!wishlistId) {
    return
  }

  try {
    await sdk.client.fetch<StoreWishlistResponse>(
      "/store/customers/me/wishlist/merge",
      {
        method: "POST",
        body: { wishlist_id: wishlistId },
        headers: { authorization },
      },
    )
  } catch (error) {
    // A 404 is routine: the list was merged or cleaned up already.
    if (!isNotFound(error)) {
      console.error("Could not merge the guest wishlist at sign-in", error)
    }
  } finally {
    await clearWishlistId()
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
  )
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
    )
  }

  console.error(fallback, error)

  return Response.json({ message: fallback }, { status: 502 })
}
