# Resend webhook operations

## Enable before sending campaigns

1. Apply backend migrations and restart the application and workers. No seed
   is needed: real signed events create receipts, not sample subscriber data.
2. In Resend, register `https://<backend-domain>/webhooks/resend` for
   `contact.updated`, `email.bounced`, `email.complained`, `email.suppressed`
   and `suppression.added`.
3. Store that endpoint's signing secret in backend `RESEND_WEBHOOK_SECRET` and
   restart. This is the `whsec_...` webhook secret, not `RESEND_API_KEY`.
   Do not expose it in the storefront or commit it.
4. Deliver a real test event and confirm HTTP 200 in Resend's delivery log.
   Then unsubscribe a test contact and verify the local subscriber status.
   Test delivery blocks with test addresses before sending real campaigns.

Verification uses the Resend SDK with the original request body and all three
Svix headers. Proxies must preserve them. No publishable key or admin login is
required; the signature authenticates the sender. Missing configuration returns
503; invalid signatures or supported-event payloads return 400. Persistence
failures are not acknowledged as successful. The body limit is 64 KiB.

See the official [signature verification guide](https://resend.com/docs/webhooks/verify-webhooks-requests).

## Consent versus delivery

- A provider unsubscribe updates local consent unless it predates newer local
  consent. Legacy audience-scoped events must match the configured audience;
  a known provider contact ID must match the stored contact ID.
- Permanent bounces, complaints and suppressions set a separate delivery block.
  Newsletter signup, confirmation, confirmation/welcome email delivery and
  subscribed-contact synchronization respect this block. Transactional mail
  continues to rely on Resend's own suppression enforcement.
- Temporary bounces are ignored. Provider opt-ins and suppression removals do
  not automatically subscribe anyone or clear local blocks. Unknown addresses
  are ignored, never imported as subscribers.
- Clearing a block is intentionally not an admin toggle. A developer must
  verify the provider's delivery state and the reason for the block before any
  controlled local change. A consent change alone is not evidence that an
  address can receive email again.

## Retries and monitoring

Each accepted actionable event has a database receipt keyed by its provider
message ID. Completed duplicates do nothing. Pending receipts retain only the
normalized fields needed to retry; completion clears that payload, including
the recipient address, while retaining the deduplication marker.

The recovery job runs every minute and processes up to 25 new receipts and 25
retryable receipts per run. It uses the same per-address lock as local consent
changes. Configure the production Redis locking/workflow modules and ensure
the worker scheduler runs. Monitor the **Webhook processing**, **Delivery
blocks** and **Contact sync** rows under **Settings > Newsletter**. A persistent
processing backlog needs investigation, not deletion of receipts.

No retention purge is currently scheduled for completed receipt markers.
Monitor table growth and define a retention policy before high-volume use.
Pending receipts contain personal data and must be included in access and
erasure procedures; do not log their payloads.

## Integration test isolation

The backend GitHub workflow runs the HTTP suite against a disposable PostgreSQL
15 service, after fresh and repeat migration checks. It checks raw-body
verification, concurrent duplicate persistence, stale events, suppression and
anonymous admin rejection. It does not replace live Resend or role-specific
authorization tests.

For local execution, provision a dedicated disposable localhost PostgreSQL
instance, explicitly configure `DB_HOST`, `DB_PORT`, `DB_USERNAME` and
`DB_PASSWORD`, then set `MEDUSA_TEST_DB_ISOLATED=1` and run
`pnpm run test:integration:http` from `apps/backend`. Use test-only backend
provider configuration as shown in `.github/workflows/backend.yml`.
The test runner creates and destroys its named test/template databases and
requires database-creation permissions. Never point it at the application
database or a shared production/staging server. The suite refuses to start
without the isolation flag and an explicit localhost host.
