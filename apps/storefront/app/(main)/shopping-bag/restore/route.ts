import type { StoreRestoreBagResponse } from "@youjaymharah/api-types"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { errorStatus, isNotFound } from "@/lib/medusa/errors"
import { sdk } from "@/lib/medusa/server"
import { setCartId } from "@/lib/medusa/session"

/**
 * The "View your bag" button in bag reminder emails
 * (`/shopping-bag/restore?token=...`). Puts the reminded bag back as this
 * browser's cart, then opens the shopping bag.
 *
 * A GET, because it is a link. Opening it twice is harmless, including when an
 * email client's link scanner opens it first: that only sets a cookie in the
 * scanner's own browser.
 *
 * On failure the shopping bag opens with `?restore=` set, for the page to
 * explain: `expired` (checked out, deleted, or an unknown link), `invalid` (no
 * token) or `failed` (the store couldn't be reached).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  let destination = "/shopping-bag"

  if (!token) {
    destination = "/shopping-bag?restore=invalid"
  } else {
    try {
      const { cart_id } = await sdk.client.fetch<StoreRestoreBagResponse>(
        "/store/bag-reminders/restore",
        { method: "POST", body: { token } },
      )

      await setCartId(cart_id)
    } catch (error) {
      destination =
        isNotFound(error) || errorStatus(error) === 400
          ? "/shopping-bag?restore=expired"
          : "/shopping-bag?restore=failed"
    }
  }

  // Outside the try: redirect() works by throwing.
  redirect(destination)
}
