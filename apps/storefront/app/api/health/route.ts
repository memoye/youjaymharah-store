/**
 * Liveness for the container health check and deploy verification. Answers
 * without calling Medusa, so a backend restart does not also mark the
 * storefront unhealthy.
 */
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "cache-control": "no-store" } },
  )
}
