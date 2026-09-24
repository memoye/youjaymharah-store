import * as Sentry from "@sentry/nextjs"

/**
 * Server-side Sentry. Without NEXT_PUBLIC_SENTRY_DSN this is inert, so local
 * development and CI report nothing.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
  })
}

/** Next calls this for errors thrown in server components and route handlers. */
export const onRequestError = Sentry.captureRequestError
