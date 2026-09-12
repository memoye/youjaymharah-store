import { loadEnv, defineConfig, MedusaError } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

/**
 * Validates REDIS_URL before any module tries to connect.
 *
 * Provider consoles offer several "connect" snippets, and pasting the
 * `redis-cli --tls -u redis://...` command instead of the URL is an easy
 * mistake: every Redis module then fails deep inside the module loader with a
 * bare "Invalid URL" and the server exits. Failing here instead names the
 * variable and says what to paste. The value is truncated in the error so a
 * token never reaches the logs.
 */
function resolveRedisUrl(): string | undefined {
  const raw = process.env.REDIS_URL?.trim();

  if (!raw) {
    return undefined;
  }

  const hint = `Got "${raw.slice(0, 24)}...". Use the connection URL (rediss://default:<token>@<host>:6379), not a redis-cli command.`;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      `REDIS_URL is not a valid URL. ${hint}`,
    );
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      `REDIS_URL must use the redis:// or rediss:// scheme, got "${parsed.protocol}". ${hint}`,
    );
  }

  return raw;
}

const REDIS_URL = resolveRedisUrl();

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Admin sessions live in Redis when it is available. Without this Medusa
    // falls back to express-session's MemoryStore, which logs every admin out
    // on each deploy and leaks memory -- it also cannot work past one instance.
    redisUrl: REDIS_URL,
    redisPrefix: process.env.REDIS_PREFIX ?? "youjaymharah:",
    sessionOptions: {
      // Ten hours: a full working day in the dashboard without re-login.
      ttl: 10 * 60 * 60 * 1000,
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  featureFlags: {
    // The dashboard gates all RBAC UI (role picker on invites, role settings
    // pages) behind this flag; the module alone does not reveal them.
    rbac: true,
  },
  modules: [
    // Durable infrastructure: with REDIS_URL set, events survive restarts and
    // workflow steps retry on schedule instead of dying with the process (the
    // default local event bus drops anything in flight on every deploy).
    // Kept conditional so a dev machine without Redis still boots on defaults.
    ...(REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: REDIS_URL,
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            // Note: this module nests its options under `redis` (the event
            // bus takes a flat `redisUrl`; the workflow engine does not).
            options: {
              redis: {
                redisUrl: REDIS_URL,
              },
            },
          },
          // Shared cache (query results, price calculations). The in-memory
          // default gives every instance its own copy and throws it away on
          // restart.
          {
            resolve: "@medusajs/medusa/caching",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/caching-redis",
                  id: "cache-redis",
                  options: {
                    redisUrl: REDIS_URL,
                    // Keyed apart from sessions and locks, so flushing the
                    // cache cannot take anything else with it.
                    prefix: "youjaymharah:cache:",
                  },
                },
              ],
            },
          },
          // Distributed locks. The in-memory default only guards one process,
          // so two instances could enter the same guarded section at once
          // (inventory reservations, order edits).
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: {
                    redisUrl: REDIS_URL,
                    namespace: "youjaymharah:lock:",
                  },
                },
              ],
            },
          },
        ]
      : []),
    {
      // Declaring this module replaces the default provider list, so emailpass
      // has to be named explicitly -- drop it and password login stops working.
      // MFA and email-verification providers are registered by the module
      // itself and are unaffected by this list.
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          // Google sign-in turns itself on once credentials exist. The
          // provider throws at boot when any option is missing, so a dev
          // machine without them still starts -- same trick as Redis above.
          ...(process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_CALLBACK_URL
            ? [
                {
                  resolve: "@medusajs/medusa/auth-google",
                  id: "google",
                  options: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    // Where Google sends the customer back: a storefront page
                    // that forwards `code` and `state` to
                    // GET /auth/customer/google/callback on this backend.
                    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
                  },
                },
              ]
            : []),
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // R2 does not implement S3 ACLs; without this the provider sends
              // `ACL: public-read` and every upload is rejected. Public reads are
              // controlled by the bucket's custom domain / public-access toggle.
              acl: false,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/rbac",
    },
    {
      resolve: "./src/modules/branding",
    },
    {
      resolve: "./src/modules/newsletter",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              // Without "email" here the module does not count this as an email
              // provider and silently falls back to the local logging provider.
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payments/credo",
            id: "credo",
            options: {
              publicKey: process.env.CREDO_PUBLIC_KEY,
              secretKey: process.env.CREDO_SECRET_KEY,
              mode: process.env.CREDO_MODE ?? "test",
              callbackUrl: process.env.PAYMENT_CALLBACK_URL,
              webhookToken: process.env.CREDO_WEBHOOK_TOKEN,
              businessCode: process.env.CREDO_BUSINESS_CODE,
            },
          },
          {
            resolve: "./src/modules/payments/paystack",
            id: "paystack",
            options: {
              secretKey: process.env.PAYSTACK_SECRET_KEY,
              callbackUrl: process.env.PAYMENT_CALLBACK_URL,
            },
          },
        ],
      },
    },
  ],
});
