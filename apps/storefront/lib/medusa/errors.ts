import { FetchError } from "@medusajs/js-sdk"

/**
 * The HTTP status behind an error, when there is one. The SDK throws
 * FetchError for failed Medusa calls, and postJson throws the same class for
 * the storefront's own routes, so one check covers both.
 */
export function errorStatus(error: unknown): number | undefined {
  return error instanceof FetchError ? error.status : undefined
}

export const isUnauthorized = (error: unknown) => errorStatus(error) === 401

export const isNotFound = (error: unknown) => errorStatus(error) === 404

/** A 4xx means the request itself was wrong, so retrying it cannot help. */
export function isClientError(error: unknown): boolean {
  const status = errorStatus(error)

  return status !== undefined && status >= 400 && status < 500
}
