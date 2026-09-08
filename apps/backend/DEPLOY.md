# Deploy Notes — Backend / Admin

Runbook for deploying `@youjaymharah/backend` to a dev environment, and the
gotchas that are easy to hit exactly once.

## Environment variables

Copy `.env.template` and fill in every key. Notes on the non-obvious ones:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 15+. Neon free tier works; make sure the URL is URL-encoded if the password contains special characters. |
| `REDIS_URL` | Optional but recommended (Upstash, standard TCP `rediss://...` URL -- not the REST one). When set, the Redis event bus and workflow engine replace the in-memory defaults: events survive deploys and failed email steps retry durably. Leave unset for local dev. |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | Comma-separated origins. Include the deployed storefront and admin origins. |
| `STOREFRONT_URL` / `ADMIN_URL` | Used to build links inside emails (order confirmations, invites, newsletter confirm/unsubscribe). Wrong values here produce dead links in live emails. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email. Without these, notification sends fail (they retry, but nothing arrives). |

## First deploy checklist

1. `pnpm install` at the repo root (pnpm; lockfile is authoritative).
2. `pnpm run build --filter=@youjaymharah/backend` (or `medusa build` in the app).
3. `pnpm exec medusa db:migrate` in `apps/backend`. This applies module
   migrations AND runs the seed scripts, which provision:
   - RBAC roles (`seed-rbac-roles.ts`)
   - Sales channel, publishable API key (token is printed to the deploy log --
     set it as the storefront's `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`),
     store record (name from `STORE_NAME`, currencies NGN default + USD),
     Nigeria region wired to `pp_credo` / `pp_paystack`, tax region, and the
     "Lagos Warehouse" stock location (`initial-data-seed.ts`)
   - The first admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, already
     attached to the Super Admin role -- log straight in, no bootstrap needed
4. Verify: `GET /health` returns 200, admin loads at `/app`, log in with
   `ADMIN_EMAIL`, and the boot log shows
   `Connection to Redis in module 'event-bus-redis' established` when
   `REDIS_URL` is set.

Not seeded on purpose: product categories, products, shipping options and
service zones (configure in the dashboard to match the real catalog and
courier pricing), and any publishable key beyond the first.

## Known gotchas

- **RBAC feature flag.** `featureFlags.rbac` must stay `true` in
  `medusa-config.ts`. The dashboard hides the role picker on invites and the
  role management pages without it, and enabling it after users exist 403s
  every role-less admin (fix: step 5 above, then re-login).
- **Webhooks and cold starts.** Payment webhooks (Credo, Paystack) hit
  `POST /hooks/payment/[provider]`. On hosts that spin idle services down
  (free tiers), a webhook arriving during a cold start is delayed; providers
  retry, but keep it in mind when diagnosing stuck payments.
- **Emails during deploys.** With the Redis workflow engine configured,
  in-flight order confirmation emails survive restarts and retry on schedule.
  Without it, anything in flight when the process stops is lost.
- **Resend audience picker.** Settings -> Newsletter needs `RESEND_API_KEY`;
  if it is missing the picker shows an error but settings can still be saved.

## Hosting (free tier to start)

Recommendation: **Render (free)** for the web service, with Neon (free) for
Postgres and Upstash for Redis.

- Railway no longer has a true free tier (one-time trial credit, then Hobby
  $5/mo). Render's Hobby workspace is genuinely $0.
- Render free caveats: spins down after 15 min idle (~1 min cold start),
  750 free instance-hours/month (enough for one always-on service), 500
  build minutes/month, 5 GB bandwidth. Fine for a dev environment.
- Render's free Postgres expires after 30 days -- use Neon instead (already
  the case) and set `DATABASE_URL` from there.
- Local filesystem is ephemeral on free tiers; the app stores uploads in
  Cloudflare R2 (S3), so nothing is lost on restart.
