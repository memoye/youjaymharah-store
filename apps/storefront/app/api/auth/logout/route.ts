import { crossOriginRefused, isSameOrigin } from "@/lib/http/same-origin"
import {
  clearAuthToken,
  clearCartId,
  clearWishlistId,
} from "@/lib/medusa/session"

/**
 * Signs out. Medusa tokens are stateless, so there is nothing to revoke on the
 * backend: deleting the cookie is the sign-out. The cart and any guest wishlist
 * go too, so the next person on this browser does not inherit them.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return crossOriginRefused()
  }

  await clearAuthToken()
  await clearCartId()
  await clearWishlistId()

  return Response.json({ success: true })
}
