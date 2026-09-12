# Storefront build order

A build order for the storefront, assuming an empty `apps/storefront` and a
backend that is already running. Each phase ends with something you can open in
a browser and judge, and nothing in a phase depends on a later one.

Framework is your choice; everything below is about what to build and which
backend capability it sits on, not which router to use.

---

## Before you start

Facts about this backend that shape almost every screen:

- **Every `/store` request needs the `x-publishable-api-key` header.** Copy the
  "Web Storefront" key from `Settings › Publishable API Keys` in the admin. A
  missing key fails with a publishable-key error, not an obvious 401.
- **Use the Medusa JS SDK** (`@medusajs/js-sdk`), not bare `fetch`. It adds that
  header and the auth token for you, and it is typed (`HttpTypes.Store*`).
- **Prices come back as-is.** ₦49.99 is `49.99`, never `4999`. Never divide by 100.
- **One region: Nigeria, currency NGN** (USD exists as a secondary currency).
  Pass `region_id` (or `country_code`) when fetching products so prices are
  calculated; without it there are no prices in the response.
- Whether prices include VAT is a store setting, so display the numbers the API
  returns rather than adding tax yourself.
- **Custom endpoints** added by this project (wishlist, newsletter, branding)
  are documented in `docs/api/openapi.json` — see `docs/api/README.md`.
- Local backend: `pnpm run backend:dev` (http://localhost:9000, admin at
  `/app`). Demo catalogue: `pnpm run seed:demo` from `apps/backend`, or
  `pnpm run seed:demo reset` to rebuild it.

---

## Phase 0 — Foundations

**Goal:** an empty but correct shell that can talk to the backend.

Build: project setup, environment variables (backend URL, publishable key), a
single shared SDK client, the region/currency lookup, base layout with header
and footer, 404 and error pages, and your design tokens (type scale, colour,
spacing).

Backend: `GET /store/regions`.

**Done when:** a page renders the store name and the Nigeria region's currency,
fetched live.

**Watch out:** decide now whether URLs carry a country prefix (`/ng/...`). It is
far more painful to add later, and with one region you may not want it at all.

---

## Phase 1 — Browse and discovery

**Goal:** shoppers can find products.

Build: home page, category pages (the catalogue nests, e.g. Women › Accessories
› Bags), collection pages, a listing grid with pagination, sorting, and search.
Product cards show image, title, price, sale price, and colour squares.

Backend:

- `GET /store/product-categories` (nested via `parent_category`,
  `category_children`)
- `GET /store/collections`
- `GET /store/products` with `region_id`, `limit`, `offset`, `q` for search
- Filter by colour or size with
  `variants[options][option_id]` / `variants[options][value]`
- `GET /store/product-options?is_exclusive=false` lists the shared **Colour**
  and **Size** options to build filter controls from

**Done when:** you can walk from the home page into a category, filter by
colour, sort, and page through results.

**Watch out:**

- Colour and Size are _shared_ options, so a product's `options[].values` may
  list every value that exists, not just the ones that product comes in. Derive
  the real list from the product's `variants[].options`.
- A colour's swatch is on the option value's metadata: `hex` (e.g. `#1c1c1c`),
  or `swatch_image` for prints. Render a square, not a word.
- Sale prices arrive as `calculated_price.calculated_amount` with
  `original_amount` and `price_list_type: "sale"` — show the original struck
  through.

---

## Phase 2 — Product page

**Goal:** enough information and confidence to add to cart.

Build: image gallery, colour swatches, size selector, price, stock messaging,
add to cart, and the details copy. Selecting a colour should switch the gallery
to that colour's photos; keep the choice in the URL so a link can open on a
specific colour.

Backend: `GET /store/products?handle=...` with `region_id`, requesting
`*variants.calculated_price`, `+variants.inventory_quantity`, `*variants.images`,
`*variants.options`, `+metadata`.

**Done when:** picking a colour and size selects a real variant, the price and
photos follow the choice, and sold-out combinations are visibly unavailable.

**Watch out:**

- Variants carry their own `images` and `thumbnail` where a colour has its own
  photography; fall back to the product's images when they are empty.
- Mark sold-out colours and sizes rather than hiding them: a variant is
  unbuyable when `manage_inventory` is true, `allow_backorder` false and
  `inventory_quantity` is 0.
- Product `metadata` holds `fit` and `care` copy; `material` holds the
  composition.

---

## Phase 3 — Cart

**Goal:** a reliable basket.

Build: add/update/remove lines, quantity control, a cart page and a drawer,
totals, promo code entry, and an empty state. Keep the cart id in a cookie and
recover gracefully when it has been completed or deleted.

Backend: `POST /store/carts`, `/store/carts/:id/line-items`,
`POST /store/carts/:id` (email, addresses, `promo_codes`).

**Done when:** a guest can build a cart, apply a promo code, and see totals that
add up.

**Watch out:**

- Show totals the way the API breaks them down: `item_subtotal`,
  `shipping_subtotal`, `discount_subtotal`, `tax_total`, `total`. Those are the
  ones that reconcile.
- Promo codes stack on sale prices by design. If that is not wanted, it is a
  merchandising decision made in the admin, not something to patch here.
- A free-delivery code only sticks once a delivery option is on the cart. Apply
  it (or re-apply it) after the delivery step, or it silently does nothing.

---

## Phase 4 — Checkout and payment

The riskiest phase; treat it as its own milestone.

**Goal:** a guest can pay with a card and get an order.

Build: email and address step, delivery option step, payment method choice,
review, then the redirect to the gateway and the return leg.

Backend, in order:

1. `POST /store/carts/:id` with email and addresses
2. `GET /store/shipping-options?cart_id=...` → `POST /store/carts/:id/shipping-methods`
3. `POST /store/payment-collections` then
   `POST /store/payment-collections/:id/payment-sessions` with the provider id
   (`pp_paystack_paystack` or `pp_credo_credo`)
4. Redirect the browser to `payment_session.data.redirect_url`
5. The gateway returns the customer to `PAYMENT_CALLBACK_URL`; on that route,
   call `POST /store/carts/:id/complete` and show the order

**Done when:** a real test-card payment produces an order, and abandoning the
payment page returns the shopper to checkout with the cart intact.

**Watch out:**

- **Guests need contact details passed explicitly.** Medusa only gives payment
  providers the customer's details when logged in, and both gateways need an
  email to open a transaction. Send `data.payer` (`email`, `first_name`,
  `last_name`, `phone`) when creating the payment session.
- Re-create the payment session immediately before redirecting, so the gateway
  charges the current total after any late change (promo code, delivery
  option).
- Nothing in the return URL proves payment. Completing the cart is what makes
  the backend verify with the gateway; a failed or cancelled payment throws and
  no order is created.
- A payment still in flight (a Credo bank transfer) becomes an order marked
  _awaiting payment_, which the gateway's webhook completes later. Do not
  present that as fully paid.
- Customers who pay and never return are handled by the webhook, so the same
  cart may already be an order when your callback runs; treat that as success.
- The system "Manual Payment" provider takes orders without collecting money.
  Useful locally, removed before launch.

---

## Phase 5 — Order confirmation and tracking

**Goal:** the shopper knows what happens next without emailing you.

Build: the confirmation page after checkout, and a page to view an order later.
Show items, totals, delivery address, payment state, fulfilment status, and
tracking numbers and links once shipped.

Backend: `GET /store/orders/:id`. Fulfilments are not in the default field set,
so request them explicitly (`fields=+fulfillments.labels.*`) — worth confirming
the exact string against the running API when you build it.

**Done when:** an order placed in Phase 4 is viewable, and a shipped order shows
its tracking link.

**Watch out:** `GET /store/orders/:id` needs no login, which is what makes the
guest confirmation page work. If you build a "track my order" page, check the
email matches the order rather than treating the id alone as proof.

---

## Phase 6 — Accounts

**Goal:** returning customers.

Build, in this order:

1. Register, log in, log out
2. Email verification landing page (the backend emails a link)
3. **Password reset: both the request form and the reset page.** The backend
   already sends customers to `/account/reset-password?token=...&email=...`, so
   build that exact route or change the link in
   `apps/backend/src/workflows/steps/send-password-reset-email.ts`. Without it,
   anyone who forgets a password is locked out.
4. Profile (name, phone), address book
5. Order history and order detail, reusing Phase 5's components
6. Claiming a guest order into an account (`/store/orders/:id/transfer/request`)
7. Google sign-in, once credentials are set (see below)

Backend: `/auth/customer/emailpass` (login, register), `/store/customers`,
`/store/customers/me`, `/store/customers/me/addresses`, `/store/orders`.

**Google sign-in** is wired up on the backend and switches on as soon as
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` are set.
The storefront side is three steps:

1. `GET /auth/customer/google` returns `{ location }` — send the browser there.
2. Google returns the customer to `GOOGLE_CALLBACK_URL`, a storefront page that
   forwards the `code` and `state` query parameters to
   `GET /auth/customer/google/callback` on the backend, which answers with a
   JWT.
3. Call `POST /store/customers/social` with that token (not
   `POST /store/customers`). If the Google email already has an account, the
   sign-in is attached to it and you get that customer back with
   `linked: true`; otherwise a new customer is created. Then treat the token
   like any other session.

Linking only happens for providers that verify the email, which is why a
Google sign-in can join an existing password account but a password signup can
never claim a Google one.

**Setting a password later.** A customer who signed up with Google has no
password, so the reset flow has nothing to reset. Offer a "create a password"
form in the account area that posts to `POST /store/customers/me/password`
with `{ password }`. They must be signed in; the email comes from their
account. If they already have a password the call is refused — that case is a
reset, not a set.

**Done when:** a customer can register, verify, log out, reset a forgotten
password, and see a past order.

**Watch out:** the store API cannot change a customer's email address — the
update payload has no `email` field. Either leave it read-only or plan the
auth-identity flow deliberately.

---

## Phase 7 — Wishlist

**Goal:** saving pieces for later, which fashion shoppers expect.

Build: a heart on product cards and the product page, and an account wishlist
page showing the saved colour and size with a link back to that variant.

Backend (custom, already built):

- `GET /store/customers/me/wishlist`
- `POST /store/customers/me/wishlist/items` (`product_id`, optional
  `variant_id`)
- `DELETE /store/customers/me/wishlist/items/:id`

**Done when:** saving from a card and from the product page both work, and the
list survives logging out and back in.

**Watch out:**

- It returns IDs only. Load the products through `/store/products` so region
  pricing applies and unpublished products drop out.
- One entry per product: posting again with a `variant_id` updates that entry to
  the chosen colour and size.
- Requires a logged-in customer. Decide what a guest's heart does — prompt to
  sign in, or keep saves in the browser and merge them on login.

---

## Phase 8 — Newsletter

**Goal:** collect email addresses, which the store currently cannot do at all.

Build: footer signup, an opt-in at checkout, and landing pages for the confirm
and unsubscribe links in the emails.

Backend (custom, already built): `POST /store/newsletter/subscribe`,
`/confirm`, `/unsubscribe` (the latter two take the token from the email).

**Done when:** a signup produces a confirmation email, and the confirm link
lands on a page that says what happened.

**Watch out:** the consent wording, success message and checkout opt-in label
live in admin-only settings, so the storefront cannot read them today. Either
hardcode the copy or add a small public endpoint that exposes those few fields.
Subscribe always answers the same way whether or not the address is already on
the list, so never infer membership from the response.

---

## Phase 9 — Ready for real traffic

Build: page metadata and share images, sitemap and robots, structured data for
products, image optimisation (allow the R2/S3 domain), loading and error states
everywhere, analytics, and an accessibility pass — keyboard operation of the
colour and size selectors, real labels on the swatches, and visible focus.

**Done when:** a Lighthouse pass is clean enough to launch behind and the site
is usable on a mid-range Android phone on a slow connection.

---

## Later, once the shop is live

- **Self-service returns.** Medusa has `POST /store/returns`, but it has no
  authentication and does not check that the order belongs to the requester.
  Put an authenticated route in front of it before exposing it, and configure a
  return shipping option in the admin.
- **Back-in-stock alerts** — needs a small backend module; valuable given how
  often sizes sell out.
- **Reorder** from a past order.
- **Notify me when a saved item goes on sale.**
- Saved cards, two-factor login, Google sign-in: all possible, none required to
  trade.
- Gift cards and store credit are not available in this Medusa version.

---

## Launch checklist

- [ ] Card payment works end to end with live keys
- [ ] Password reset works (request → email → reset → log in)
- [ ] Order confirmation email arrives and its totals match the site
- [ ] Sold-out sizes cannot be added to a cart
- [ ] Delivery prices and any free-delivery threshold are right
- [ ] Manual Payment removed from the Nigeria region
- [ ] Newsletter signup stores a subscriber and confirms by email
- [ ] Tested on a phone, not just a desktop browser
