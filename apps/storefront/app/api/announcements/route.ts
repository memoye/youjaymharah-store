import type { StoreAnnouncementsResponse } from "@youjaymharah/api-types"
import { sdk } from "@/lib/medusa/server"

export async function GET() {
  const headers = { "Cache-Control": "no-store" }
  try {
    const data = await sdk.client.fetch<StoreAnnouncementsResponse>(
      "/store/announcements",
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    )
    return Response.json(data, { headers })
  } catch {
    return Response.json(
      { message: "Announcements unavailable" },
      { status: 503, headers },
    )
  }
}
