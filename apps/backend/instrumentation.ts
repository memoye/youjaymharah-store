import * as Sentry from "@sentry/node";

/**
 * Called by `medusa start` before the server boots, which is early enough for
 * Sentry's global handlers to catch anything thrown during startup.
 *
 * Without SENTRY_DSN this does nothing, so development and CI stay quiet.
 */
export function register() {
  const dsn = process.env.SENTRY_DSN?.trim();

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    // Tracing is off by default: on a 1 GB instance the sampling overhead buys
    // less than the error reports do. Raise it when chasing a slow endpoint.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Shoppers' addresses and emails pass through these requests.
    sendDefaultPii: false,
  });
}
