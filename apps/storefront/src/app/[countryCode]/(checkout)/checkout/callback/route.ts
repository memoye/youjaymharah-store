import { isRedirectPayment } from "@lib/constants"
import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, getCartId } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

/**
 * Return leg for Paystack and Credo. The gateway sends the customer here
 * (PAYMENT_CALLBACK_URL, which the proxy prefixes with the country code) after
 * they finish -- or abandon -- the hosted payment page.
 *
 * Nothing in the query string is trusted to decide whether money moved.
 * Completing the cart makes the backend verify the transaction with the
 * gateway server-side: a failed or cancelled payment throws and the customer
 * goes back to review; a successful one becomes an order. A payment still in
 * flight (e.g. a bank transfer) becomes an order awaiting payment, which the
 * gateway's webhook captures later.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ countryCode: string }> }
) {
  const { countryCode } = await params
  const { origin, searchParams } = req.nextUrl
  const base = `${origin}/${countryCode}`

  const backToReview = () =>
    NextResponse.redirect(`${base}/checkout?step=review&payment_error=1`)

  const cartId = await getCartId()

  if (!cartId) {
    // Different browser/device, or the cart already became an order and the
    // cookie was cleared. The webhook still completes the order server-side.
    return NextResponse.redirect(`${base}/cart`)
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: {
        fields:
          "id,payment_collection.payment_sessions.provider_id,payment_collection.payment_sessions.data",
      },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const session = cart?.payment_collection?.payment_sessions?.find((s) =>
    isRedirectPayment(s.provider_id)
  )

  if (!session) {
    return backToReview()
  }

  // Both gateways echo the reference back (Paystack as `reference`/`trxref`,
  // Credo as `reference`/`transRef`). If it names a different transaction,
  // the customer paid an older session -- e.g. they changed the cart in another
  // tab after being redirected -- so don't complete this one.
  const returned = ["reference", "trxref", "transRef"]
    .map((key) => searchParams.get(key))
    .filter((value): value is string => Boolean(value))
  const known = [session.data?.reference, session.data?.gateway_reference]

  if (returned.length && !returned.some((ref) => known.includes(ref))) {
    return backToReview()
  }

  try {
    // Redirects to the order confirmation page on success.
    await placeOrder(cartId)
  } catch (error) {
    unstable_rethrow(error)

    return backToReview()
  }

  // Only reached when the cart did not convert into an order.
  return backToReview()
}
