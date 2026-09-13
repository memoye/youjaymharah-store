import { crossOriginRefused, isSameOrigin } from "@/lib/http/same-origin";
import { clearAuthToken, clearCartId } from "@/lib/medusa/session";

/**
 * Signs out. Medusa tokens are stateless, so there is nothing to revoke on the
 * backend: deleting the cookie is the sign-out. The cart goes too, so the next
 * person on this browser does not inherit it.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return crossOriginRefused();
  }

  await clearAuthToken();
  await clearCartId();

  return Response.json({ success: true });
}
