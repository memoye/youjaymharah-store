# Trending-search privacy

Trending is a ranking of reviewed public phrases, not a public log of whatever
shoppers type. With no approved phrases configured, searches still work, but
trending returns an empty list and collects no new term statistics.

## Manage reviewed phrases in admin

Open **Settings > Trending searches**. Marketing, Store Managers and the owner
can edit using the existing `storefront_settings:update` permission; staff with
read access only can view the list. Enter one reviewed catalog phrase per line
and save. The editor normalizes case/spacing, removes duplicates, and accepts
up to 100 phrases of 2–64 letters, spaces, apostrophes or hyphens each.

An empty saved list disables collection and public trending. Requests and
workers read the database without a process-local cache or restart. Requests
already in flight may finish with the list they read. Queued searches are
rechecked by the subscriber and recording step/service. Stale admin saves are
rejected; use **Reload latest** and review the new list before saving again.

This is an approval list, not a manual ranking or a list of private searches.
It does not import customer queries or create a pending-approval queue. Approval does not
bypass popularity thresholds or current product visibility.

Before deploying this editor, run `pnpm exec medusa db:migrate --skip-scripts`
from `apps/backend` to create `search_vocabulary`. No catalog seed is needed.
Do not run the new code before its migration or drop that table while the
new application is running.

## Initial seed

The initial store seed adds 20 common clothing/fabric phrases: `dress`,
`dresses`, `linen`, `cotton`, `silk`, `wool`, `shirt`, `shirts`, `t-shirt`,
`top`, `tops`, `trousers`, `skirt`, `skirts`, `blazer`, `coat`, `jacket`,
`cardigan`, `jumper`, and `jumpsuit`. Review these in the admin editor for your
catalog. Seeding does not create products, departments, or artificial search
counts; the normal popularity and product-visibility checks still apply.

Existing stores whose initial seed already ran can use
`pnpm run seed:search-vocabulary` from `apps/backend` after migrating.
Do not rerun the whole initial store seed just to add phrases.
The focused seed never overwrites a saved list, including an intentionally
empty list, and is safe to rerun. It shares the admin-save lock.

When `SEARCH_TRENDING_TERMS` is explicitly configured, the seed uses that list
instead of the starter terms; `[]` preserves an intentionally disabled setup.
Leave the variable blank or unset to use the starter terms on first seed.

## Initial environment fallback

A developer sets `SEARCH_TRENDING_TERMS` on the backend, for example:

```dotenv
SEARCH_TRENDING_TERMS='["dresses","linen","bags"]'
```

Before the first admin save or seed, restart backend and workers to change this fallback.
The first admin save or seed makes the database authoritative, even for an empty list;
environment settings cannot re-enable removed phrases. Database errors do not
fall back to environment settings. Keep the legacy variable valid or remove it;
startup still validates it. Without a seed or environment configuration, the vocabulary is empty.

The fallback accepts up to 100 phrases,
each 2–64 characters long, using letters, spaces, apostrophes or hyphens.
Malformed configuration fails startup without printing its value. Terms are
normalized for Unicode compatibility, casing and whitespace; matching is
exact, not substring or typo matching. The product search itself still uses
the shopper's original query and retains its existing matching behavior.

Marketing or the store owner should approve the phrases as public catalogue
language before the developer enables them. Do not add names, contact details,
order references, private product labels or customer messages. Syntax checks
cannot decide whether a phrase is personal information. The environment example
is separate from the starter vocabulary listed above.

## Collection and visibility

- Only approved phrases are emitted to the trending event queue. The subscriber,
  workflow and storage service check approval again to reject older queued
  input or direct calls.
- Public reads select only currently approved phrases, including when old
  unapproved records remain in the database.
- A phrase needs at least five submitted searches in the last seven UTC day
  buckets and a nonzero latest result count. Suggestion requests do not count.
- Each returned phrase is checked against current published products in the
  sales channels allowed by the request's publishable key. An empty channel
  scope or missing Search Module returns no phrases. Availability-check errors
  fail the request rather than serving unchecked phrases.
- The response uses `Cache-Control: no-store`. If a CDN, storefront server or
  client maintains its own trending cache, invalidate it when removing phrases
  or deploying this change; this backend change cannot purge external caches.

Up to ten phrases are requested by the public API. Each candidate requires one
small product search, so monitor latency and search-provider usage. Results may
contain fewer phrases than requested after current availability is checked.

## Retention and limits

No IP addresses or customer identifiers are added to search-stat records.
Counts aggregate requests across storefront sales channels; they are not
unique shoppers or a per-channel demand measurement. Rate limiting reduces
volume but does not prevent a determined client from inflating an approved
phrase's rank.

Existing unapproved statistics are hidden, not deleted by this rollout. The
existing weekly retention job deletes at most 5,000 rows older than 90 days per
run, so a backlog can last longer. Review legacy data, queued events, workflow
history and backups before launch. Any immediate historical-data purge should
be explicitly scoped and approved; this pass does not run one.

The search request still contains the original query. Configure URL/query
redaction and retention separately for reverse-proxy logs, application tracing,
analytics and the search provider. This feature only controls the trending
pipeline; it is not a guarantee that arbitrary search text is never logged
anywhere in the system.

The editor requires the additive vocabulary migration, not a catalog seed.
Unit tests cover database authority, empty-list disabling, pre-queue filtering,
normalization, rejected configuration, hidden legacy rows, minimum counts and
sales-channel visibility. Targeted PostgreSQL checks cover admin permissions,
validation, persistence and stale-save conflicts; CI still needs verification
on the deployment commit.
