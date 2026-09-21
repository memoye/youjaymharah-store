# Email retry behavior

Password resets, email verification, team invites, refunds and order edits use
two workflow steps: prepare the notification once, then send it. The workflow
engine retains the preparation output when retrying a failed send. The delivery
step retries up to five times, 15 seconds apart. Production requires the Redis
workflow engine; local in-memory retries do not survive a restart.

## Delivery identities

| Email              | Identity used before hashing                |
| ------------------ | ------------------------------------------- |
| Password reset     | Actor type, recipient, reset token          |
| Email verification | Recipient, verification token               |
| Team invite        | Invite ID, recipient, current invite token  |
| Refund             | Exact refund ID                             |
| Order update       | Order ID and sorted, unique edit action IDs |

Keys are SHA-256 hashes with an email prefix. Tokens and email addresses are
not sent as plaintext in the idempotency header. A new token, partial refund or
order edit gets a new key. Separate recipient/actor identities cannot collide
through ambiguous string concatenation.

The notification data itself still contains recipient addresses and, for
authentication emails, links with credentials. Restrict access to notification
and workflow records and include them in retention and erasure policies.

## Refunds and edits

The refund subscriber listens to Medusa's `payment.refund.created` module event,
not `payment.refunded`. The latter only names the payment and cannot identify
which of several partial refunds caused the event. The preparation step queries
the refund by ID and includes its amount and customer-facing reason label,
never the internal refund note. Provider-rejected refunds must not leave a
refund or generate customer mail. Nested cleanup can flush a created event
after deleting the failed refund; preparation rejects that missing record.
The isolated payment suite covers this path against the installed framework.

Order-edit events supply action IDs. Missing IDs fail preparation rather than
using an order-wide key that could suppress later updates. The email is a
summary of the order when preparation runs, not a historical reconstruction of
the edit. A delayed initial event may therefore summarize a later order state;
delivery retries of that execution retain its prepared snapshot.

Verification emails display a fixed UTC expiry time instead of recalculating
remaining minutes on each attempt. A resent invitation with a renewed token
has a new delivery identity. An older already-prepared email can still arrive
late with its original link; preparation does not extend or renew credentials.

## Limits and rollout

Resend keeps idempotency keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys).
This is duplicate protection within that window, not permanent exactly-once
delivery. A changed payload under the same key is a provider conflict; do not
work around it by generating random keys. A replay started as a new workflow
can read newer branding or order data, unlike a send-step retry inside an
existing execution. Template or sender changes during a retry can also alter
the rendered provider request. Permanent delivery tracking and rendered-body
snapshots across deploys remain follow-ups.

Do not assign the stable provider key to Medusa's notification database key:
Medusa 2.19's failed-key path can reference an unpersisted notification ID.
These workflows create separate notification attempts while keeping the Resend
key stable.

No migration or seed is needed for these email changes. Restart the backend
and workers to load the renamed refund subscriber. The five workflow graphs
have changed: finish or explicitly review old pending executions before
deploying into an environment that already has queued emails. Do not blindly
replay an old refund workflow input containing only `payment_id`; the new
input requires `refund_id`.

Unit tests cover identities, skipped notifications and snapshot retry behavior.
The new PostgreSQL integration suites are wired into CI but still need their
first successful isolated run. They do not send live gateway requests or prove
live-provider compatibility.
