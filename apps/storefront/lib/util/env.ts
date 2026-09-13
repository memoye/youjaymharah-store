/**
 * The storefront's public address, used for absolute URLs in metadata (Open
 * Graph images, canonical links). Local development runs over plain http.
 */
export const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
}
