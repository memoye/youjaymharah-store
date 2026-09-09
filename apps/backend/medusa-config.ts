import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            // Note: this module nests its options under `redis` (the event
            // bus takes a flat `redisUrl`; the workflow engine does not).
            options: {
              redis: {
                redisUrl: process.env.REDIS_URL,
              },
            },
          },
        ]
      : []),
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
