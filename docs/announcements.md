# Store announcements

Manage top-of-page messages in **Settings → Storefront → Announcements**.
These are editorial content, separate from Store menu cards and Medusa's
Promotions/Campaigns (which calculate discounts). Creating a promotion does not
automatically create an announcement.

## Admin behavior

- Save up to 20 ordered announcements, each with its own enabled switch.
- The global switch hides the entire bar without deleting its contents.
- Optional start/end dates use the admin browser's timezone and are stored as UTC.
  The start is inclusive and the end is exclusive.
- Choose an existing collection, public category, published product, or known
  store page for a link. URLs are derived from current handles, not entered by hand.
- Optionally associate a promotion. Its active status, campaign dates, and global
  budget determine whether the announcement is eligible. Manual codes are read
  from the promotion; automatic promotions have no displayed code. Cart/customer
  eligibility is still checked at checkout. Only associate publicly advertised
  offers, not private/customer-specific codes.
- A deleted/unavailable destination or related promotion hides the announcement
  on the storefront. Choose a replacement or remove the reference before saving.
- Light/dark appearance and session dismissal apply to the entire bar.

The bar is store-wide, not scoped to departments. No additional categories are
needed. Multiple messages render in saved order, not category order.

## Storefront contract

`GET /store/announcements` requires a publishable API key and returns only live
messages. Drafts and future copy are never included. The Next.js proxy at
`/api/announcements` uses the configured server SDK and does not cache responses.

`AnnouncementBanner` is mounted above the header. Its UI is intentionally basic:

- Zero eligible, undismissed messages: nothing rendered.
- One: static message, optional link/code and dismiss button.
- Two or more: manual previous/next controls and position count. No auto-rotation.

`features/announcements/use-announcements.ts` handles fetching, refreshing,
expiry, selection, and per-tab session dismissal. The helper module contains
testable mode/navigation/dismissal/expiry functions. Change presentation in
`components/layout/announcement-banner.tsx` without changing the backend contract.

Responses include `server_time` and `valid_until`. The hook accounts for request
duration and refreshes before expiry, or at the next known schedule boundary.
If a response cannot be refreshed, the banner hides. It rechecks on focus,
visibility changes, and reconnect. Unscheduled backend edits are reflected within
60 seconds while the tab is active. Editing an announcement's visible content
makes it reappear even if its previous content was dismissed.

## Migration and demo data

From `apps/backend`:

```sh
pnpm exec medusa db:migrate
pnpm run seed:announcements
```

The dedicated seed only fills an empty, disabled bar. It creates two live messages,
one disabled draft, one scheduled for the next day, and one ended message. It does
not create discounts or categories. Running it again preserves existing messages.
An intentionally cleared, disabled bar is considered empty and will be populated
again by this development seed. `pnpm run seed:demo` includes the same seed helper.

To test static mode, disable one of the two live samples. To test no banner,
disable the global switch. The scheduled sample becomes a third live message the
following day unless disabled. These fixtures are for development only.
