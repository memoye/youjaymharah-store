import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { completeSignIn } from "@/lib/medusa/auth";
import { sdk } from "@/lib/medusa/server";

/**
 * Where Google sends the customer back (the backend's GOOGLE_CALLBACK_URL).
 *
 * 1. Exchanges Google's code for a Medusa token.
 * 2. Calls the backend's /store/customers/social, which links the sign-in to an
 *    existing account with the same verified email, or creates a customer.
 * 3. Refreshes the token: the one from step 1 can predate the customer, and a
 *    refreshed token carries it.
 */
export async function GET(request: NextRequest): Promise<never> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  let destination = "/";

  if (!code || !state) {
    destination = "/?auth_error=google_cancelled";
  } else {
    try {
      const callbackToken = await sdk.auth.callback("customer", "google", {
        code,
        state,
      });

      if (typeof callbackToken !== "string") {
        throw new TypeError("Google sign-in asked for an extra step.");
      }

      const authorization = { authorization: `Bearer ${callbackToken}` };

      await sdk.client.fetch("/store/customers/social", {
        method: "POST",
        headers: authorization,
        body: {},
      });

      const { token } = await sdk.auth.refresh(authorization);

      await completeSignIn(token);
    } catch (error) {
      console.error("Google sign-in could not complete", error);
      destination = "/?auth_error=google_failed";
    }
  }

  // Outside the try: redirect() works by throwing, and a catch would swallow it.
  redirect(destination);
}
