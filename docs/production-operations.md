# Production operations

## Decisions and rollout status

The owner approved the log-retention policy below on September 21, 2026.
Approval defines the policy; it does not mean the hosted services enforce it
yet. No account-level configuration, deletion, backup or restore was performed
when recording these decisions.

| Area                        | Decision                                             | Configuration status                                             |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Hosting                     | One VPS (OVH), Docker Compose, see deployment.md     | Configuration in repo; host not yet provisioned                  |
| PostgreSQL                  | Neon                                                 | Restore window and backup policy pending plan/account review     |
| Redis                       | Container on the VPS (noeviction, append-only)       | Configured in infra/compose.yaml                                 |
| DNS/edge                    | Cloudflare recommended in front of the VPS           | Provider/domain and origin protection not yet confirmed          |
| Application monitoring      | PostHog intended                                     | Backend/worker instrumentation, alerts and account setup pending |
| Availability/job monitoring | External uptime and heartbeat monitoring recommended | Provider not yet selected                                        |
| Alert destination           | Not yet supplied                                     | No notifications configured                                      |
| Operational logs            | 30 days approved                                     | Hosted expiry not yet configured                                 |
| Security logs               | 90 days approved                                     | Hosted expiry not yet configured                                 |

## Approved log-retention policy

| Data class                                                           | Retention                | Examples and limits                                                                                                                                |
| -------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operational logs                                                     | 30 days                  | Application errors, request status/latency, deploy logs, job outcomes and mail-delivery diagnostics                                                |
| Security logs                                                        | 90 days                  | Authentication/authorization failures, suspicious rate-limit activity, signature failures and administrative access/permission-change audit events |
| Orders and payment records                                           | Unchanged                | Not operational logs; no deletion authorized by this policy                                                                                        |
| Consent and suppression records                                      | Unchanged                | Preserve opt-outs, delivery blocks and consent evidence                                                                                            |
| Unfinished jobs/workflows and pending webhook receipts               | Unchanged                | Preserve retry state and recovery data; investigate backlogs instead of deleting them                                                              |
| Completed notifications/workflows and webhook deduplication receipts | Separate policy required | Do not apply log expiry to application tables or deduplication state                                                                               |
| Database backups, snapshots and restore history                      | Pending                  | Set separately after reviewing the Neon plan and recovery requirements                                                                             |
| Product analytics and session recordings                             | Separate policy required | PostHog analytics/replay retention is not automatically covered by these log periods                                                               |

Apply the periods to each log record's age, not the last time someone viewed it.
Confirm how the chosen provider calculates age, handles delayed ingestion and
physically expires data. Shorter UI search history is not proof of deletion.
Classify security events explicitly: not every error is a security event, and
an administrative permission change can be security-relevant without an error.
Do not retain all application logs for 90 days just to keep security events.

These periods do not authorize a database-wide purge, shortened backup history,
or a change to existing search-statistics and guest-wishlist cleanup jobs.
Orders/payment records need their own business retention decision; leaving them
unchanged here is not a decision to retain them forever.

## Enforcing the policy in hosted services

1. Inventory every copy: container logs on the VPS (Docker keeps 5 x 10 MB per
   container, so they age out by volume, not by date), GitHub Actions deploy
   logs, backend and worker exports, PostHog logs/errors, edge logs, alert destinations and any
   archived exports. Record the owner, destination and actual expiry for each.
2. Select a destination capable of separate operational/security retention.
   Configure 30-day and 90-day streams or equivalent per-class lifecycle rules.
   Do not silently substitute the provider's default period.
3. Review provider-managed copies. On the VPS, Docker's size-based rotation
   is the only expiry, so a quiet container can keep lines longer than 30
   days and a busy one far less; a shipper with per-class lifecycle rules is
   what makes the periods enforceable. GitHub keeps Actions logs for the
   repository's configured retention (90 days by default). Searchable
   retention is not evidence of physical erasure: confirm deletion semantics
   with each provider if enforcing a hard maximum across all copies.
4. Verify PostHog's actual project/plan settings before selecting it as the
   retention destination. Its [Logs product](https://posthog.com/docs/logs)
   accepts OpenTelemetry records; installing product analytics alone does not
   export Medusa server or worker logs, classify security events, or set expiry.
5. Redact at the source/collector, before the first external copy. Exclude
   authorization headers, cookies, passwords, connection strings, API keys,
   reset/verification/unsubscribe tokens, raw webhook bodies and payment
   payloads. Avoid customer email/address data and full URLs/query strings.
   Prefer event type, route template, status, duration, request ID and release.
   Existing application/provider logs still need that redaction review.
6. Restrict log access, protect exporter credentials, and prevent full payloads
   from leaking into alert messages. Apply expiry to alert copies/exports too;
   a forwarded email or downloaded archive does not inherit the source TTL.
7. Record the configured lifecycle rules and evidence of expiry before marking
   this item complete. Check both streams and provider-managed copies. Do not
   use production customer data as a deletion test fixture.

The backend writes logs to its logging system; it does not own the hosted
provider's storage. No backend deletion cron or unused `LOG_RETENTION_DAYS`
environment variable is added as a substitute for provider-side lifecycle rules.

## Backups and restore drills

Backup retention is deliberately separate from 30/90-day log retention. Before
launch, record the approved recovery-point target (acceptable data loss),
recovery-time target (acceptable outage), Neon's configured restore window,
and whether an independent encrypted backup is required. Verify the actual
project settings rather than assuming a plan's maximum is enabled.

A restore drill must use a new, isolated target, never rewind the live branch:

1. Record the source project/branch, recovery point and deployed app revision.
   Do not put connection strings or credentials in the drill report.
2. Restore to an isolated branch/database with restricted access. A restored
   copy contains real customer data even if it is called staging.
3. Do not start the app against it until production Redis, payment/email
   credentials, webhooks, scheduled jobs and storefront revalidation are
   disconnected. Prefer read-only inspection first. A different Redis prefix
   alone is not isolation for a restore drill.
4. Verify the schema/migration state and representative order, payment,
   inventory and consent records without altering the source. Record elapsed
   time, gaps and whether the recovery targets were met.
5. A database restore is not a rollback of gateway payments or sent emails.
   Reconcile external payments, opt-outs, suppression updates and queued jobs
   before any real recovery cutover. Never blindly replay restored queues.
6. Review and explicitly approve cleanup of the exact drill resources. Record
   who performed the drill and where the access-controlled evidence is stored.

No production restore, independent backup export or resource deletion is
authorized just by approval of the log-retention periods.

## Next implementation gates

- Confirm the alert recipient and uptime/heartbeat service.
- Confirm the Cloudflare domain/plan and prevent direct-origin bypass before
  trusting forwarded shopper addresses.
- Select/configure the log destination that meets the approved periods and
  verify the retention/deletion semantics of provider-managed copies.
- Review Neon project settings and agree backup/recovery targets.

Continue operational configuration and implementation improvements before
expanding the test matrix, as requested. This does not remove the need to
validate configuration and exercise recovery before launch.

See the separate backend/admin and storefront lists in
[Security and reliability](security-and-reliability.md).
