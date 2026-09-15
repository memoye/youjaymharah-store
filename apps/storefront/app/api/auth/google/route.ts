import { redirect } from "next/navigation"

import { sdk } from "@/lib/medusa/server"

/**
 * "Continue with Google": link or navigate to this route. It asks Medusa for
 * Google's consent-screen URL and sends the browser there.
 *
 * Google returns the customer to the backend's GOOGLE_CALLBACK_URL, which must
 * point at /api/auth/google/callback on this storefront.
 */
export async function GET(): Promise<never> {
  let location: string | undefined

  try {
    const result = await sdk.auth.login("customer", "google", {})

    if (typeof result !== "string" && "location" in result) {
      location = result.location
    }
  } catch (error) {
    console.error("Google sign-in could not start", error)
  }

  // Outside the try: redirect() works by throwing, and a catch would swallow it.
  redirect(location ?? "/?auth_error=google_unavailable")
}
