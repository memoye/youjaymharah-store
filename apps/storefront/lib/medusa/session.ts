import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE, CART_COOKIE } from "./constants";

/**
 * Must not outlive the token inside it. Medusa signs customer tokens for its
 * `jwtExpiresIn` setting, which defaults to one day -- raise both together.
 */
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24;

/** A basket is worth keeping for longer than a login. */
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const baseCookie = {
  httpOnly: true,
  // Local development runs over plain http, where a Secure cookie is dropped.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

// Reading works anywhere on the server. Setting and deleting only work in Route
// Handlers (and Server Functions); Next.js refuses during Server Component
// rendering, because the response has already started streaming.

export async function getAuthToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

export async function setAuthToken(token: string): Promise<void> {
  (await cookies()).set(AUTH_COOKIE, token, {
    ...baseCookie,
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
}

export async function clearAuthToken(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}

export async function getCartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

export async function setCartId(cartId: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, cartId, {
    ...baseCookie,
    maxAge: CART_MAX_AGE_SECONDS,
  });
}

export async function clearCartId(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
