# Trending-search privacy

Trending is a ranking of reviewed public phrases, not a public log of whatever
shoppers type. With no approved phrases configured, searches still work, but
trending returns an empty list and collects no new term statistics.

## Enable a reviewed vocabulary

A developer sets `SEARCH_TRENDING_TERMS` on the backend, for example:

```dotenv
SEARCH_TRENDING_TERMS='["dresses","linen","bags"]'
```

Restart the backend and workers together. The list accepts up to 100 phrases,
each 2–64 characters long, using letters, spaces, apostrophes or hyphens.
Malformed configuration fails startup without printing its value. Terms are
normalized for Unicode compatibility, casing and whitespace; matching is
exact, not substring or typo matching. The product search itself still uses
the shopper's original query and retains its existing matching behavior.

Marketing or the store owner should approve the phrases as public catalogue
language before the developer enables them. Do not add names, contact details,
order references, private product labels or customer messages. Syntax checks
cannot decide whether a phrase is personal information. There is no admin
vocabulary editor in this pass, and these examples are not seeded into the
database or enabled automatically.

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

No database migration or seed is needed. Unit tests cover pre-queue filtering,
normalization, rejected configuration, hidden legacy rows, minimum counts and
sales-channel visibility. PostgreSQL integration checks remain a CI task.
