import { FetchError } from "@medusajs/js-sdk"

/**
 * POSTs to one of the storefront's own /api routes (not Medusa's -- use the SDK
 * for those). Failures throw the SDK's FetchError, so React Query's retry rules
 * and error checks in lib/medusa/errors.ts treat both the same way.
 */
export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as {
    message?: string
  }

  if (!response.ok) {
    throw new FetchError(
      data.message ?? response.statusText,
      response.statusText,
      response.status,
    )
  }

  return data as T
}
