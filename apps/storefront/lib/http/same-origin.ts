/**
 * CSRF guard for Route Handlers that change something.
 *
 * Browsers send `Origin` on every non-GET fetch, so a missing or foreign
 * Origin is refused. Behind Render's (or any) reverse proxy the public host
 * arrives as `x-forwarded-host` rather than `host`.
 *
 * Server Actions get this check from Next.js automatically; Route Handlers do
 * not, which is why every mutating handler here calls it.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")

  if (!origin) {
    return false
  }

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function crossOriginRefused(): Response {
  return Response.json(
    { message: "Cross-origin request refused." },
    { status: 403 },
  )
}
