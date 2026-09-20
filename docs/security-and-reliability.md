# Security and reliability

## Changes in the September 2026 pass

- Redirect payment authorization and capture compare the verified amount, currency, and merchant reference to the stored session. Credo reads `transAmount`, `currencyCode`, and `businessRef`; refunded transactions cannot authorize a new order. Payment HTTP requests have a 15-second deadline and are not automatically retried by the client.
- Credo supports the raw-body `credo-signature` HMAC described in its security documentation. The explicitly configured legacy `X-Credo-Signature` token/business-code check remains available. An invalid HMAC never falls back to the legacy check. Credo's published guides disagree about the signing scheme: confirm the actual sandbox payload/header before launch. See [Credo security](https://docs.credocentral.com/docs/compliance-and-security) and its [testing guide](https://docs.credocentral.com/docs/developers/testing).
- Newsletter confirmation credentials are separate from unsubscribe credentials and expire after 24 hours. Confirmation replay cannot reverse an unsubscribe. New signups rotate credentials; existing unsubscribe URLs still work until a new signup rotates them. Old confirmation URLs must be replaced by signing up again.
- Signup, consent changes, and contact synchronization share a per-address lock. Repeat pending signups within 60 seconds do not send another email. Failed downstream delivery does not roll back consent.
- Newsletter contact synchronization has a durable `sync_pending` flag and a five-minute reconciliation job, processing up to 100 records per run. Existing non-pending subscribers are queued by the migration. The admin page shows total subscriber counts and the number waiting to sync. Missing audience settings keep records queued; pending double opt-in records are not sent to Resend.
- Subscriber API pagination is bounded to 100 and token credentials are excluded from its response. Permission-query failures deny UI actions, including when old grants remain cached; API policies remain the authorization boundary.
- Newsletter Reply-To no longer replaces the verified sender. Resend requests have a 15-second deadline. Newsletter, initial order/cancellation/shipment/delivery, return, claim, exchange, product-alert, and cart-reminder emails carry stable provider delivery keys.
- Provider delivery identity is distinct from Medusa notification-attempt identity. Medusa 2.19's failed-key retry path generates a new notification ID without inserting that ID. Reminder/alert retry records therefore retain attempt-specific database keys, while Resend receives a stable key. [Resend deduplication expires after 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); this is not an exactly-once guarantee. Authentication, refund, and order-edit notifications still need event-specific delivery-key work.
- Cart recovery expires seven days after the last reminder and checks the cart's email and customer ownership. Completed, stopped, recovered, or failed reminders cannot restore a cart. Stop-reminder links do not expire.
- Search increments are serialized through Medusa's locking module. Trending aggregation uses the newest result count, and persistence failures are no longer silently swallowed. Trending and suggestion routes are included in generated API documentation.
- The menu-card rename migration is conditional, with explicit approval to amend that historical migration. CI now runs unit tests and includes fresh PostgreSQL migration and repeat-run checks. The backend exposes a `test` script so root Turbo tests include it.

## Public request throttling

Limits use Medusa's shared cache and distributed locks in production, with hashed address keys retained for two minutes. Fixed one-minute windows allow bursts across a window boundary. Infrastructure failure returns 503 rather than bypassing the limit; exhausted quotas return 429 with `Retry-After`.

| Route group | Requests per address per minute |
| --- | ---: |
| Newsletter signup | 5 |
| Newsletter confirm/unsubscribe, combined | 30 |
| Product-alert signup | 10 |
| Cart reminder links | 30 |
| Search and search suggestions/trending, combined | 120 |

These are application controls, not a substitute for perimeter protection. Configure an edge/WAF limit for authentication, password resets, uploads, guest wishlist writes, and broad traffic spikes. Verify trusted-proxy configuration against the actual hosting topology. Do not trust arbitrary client-supplied forwarding headers. If storefront requests originate from a server proxy, verify address attribution there before enabling traffic; otherwise shoppers share the proxy's quota. IPv6 address rotation and distributed clients still require edge controls.

## Deployment checklist

1. Use the declared Node 22.12+ (22.x) runtime. The local verification environment was Node 24 and reported an engine mismatch.
2. Take a database backup before deployment; apply `pnpm exec medusa db:migrate` from `apps/backend`. No catalog reseed is required for this pass. Do not roll back the additive newsletter migration while the new app is running.
3. Set `NODE_ENV=production`, a working `REDIS_URL`, and independent random JWT/cookie secrets of at least 32 characters. Startup rejects missing Redis or short secrets; build does not require these runtime secrets. Redis must use a non-evicting policy. Keep production/staging infrastructure isolated.
4. Use HTTPS, exact CORS origins, private database/Redis connectivity, and TLS certificate verification. Never place secret credentials in public environment variables. Redis-validation errors no longer print any part of its URL.
5. Restart application and worker processes after migration. Verify that the five-minute newsletter job runs and queued counts fall. Check the audience and Resend API permissions if records stay queued.
6. Complete sandbox payment tests: correct payment, underpayment, currency/reference mismatch, duplicate and malformed webhooks, refunds, and delayed payment verification. Unit tests mock the gateways; they do not establish live-provider compatibility.
7. Test Resend against a test audience before sending broadcasts. Integrate provider-originated unsubscribe/suppression events before relying on Resend's own unsubscribe tools: local consent and external opt-outs must not diverge. This pass reconciles local state outward; it does not add inbound Resend webhooks.
8. Verify the fresh-database migration CI job. The local migration exercised the existing database; CI's fresh-database path still needs its first run.
9. Alert on payment verification failures, prolonged newsletter sync backlog, failed workflows/jobs, 429/503 rates, and mail failures. Exercise a backup restoration before launch.

## Remaining dependency findings

The production audit after compatible overrides reports **0 critical, 0 high, 2 moderate** findings. Overrides are in `pnpm-workspace.yaml`; the lockfile was regenerated by pnpm. Remove overrides when the upstream packages adopt safe versions.

| Package | Remaining version | Follow-up |
| --- | --- | --- |
| `uuid` | 9.0.1, via BullMQ | Upgrade the owning dependency or test a targeted major-version override. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). |
| `csv-parse` | 5.6.0, via Medusa core flows | Upgrade through Medusa or test the 7.x parser against product-import fixtures. Restrict CSV import permissions and use trusted import files meanwhile. [Advisory](https://github.com/advisories/GHSA-8cw4-87c7-c6xx). |

Major-version overrides were not forced in this pass. Re-run `pnpm audit --prod` routinely; this result is a point-in-time check, not a security certification.

Other follow-ups: inbound email-provider suppression handling, integration tests for RBAC and payment completion, durable email delivery tracking beyond the provider's deduplication window, and moderation/privacy controls for public trending queries. Trending counts are search requests, not unique shoppers; throttling alone does not make them abuse-resistant or guarantee that arbitrary query text contains no personal data.
