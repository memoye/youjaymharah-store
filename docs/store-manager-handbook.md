# Running the Youjaymharah store

Operations handbook for the store manager: taking the store from an empty
production database to its first shipped order, then keeping it running.

- Admin: `https://<admin-domain>/app`
- Region: Nigeria, NGN
- Warehouse: Lagos Warehouse
- Payments: Paystack, Credo (hosted checkout)
- Platform: Medusa 2.19

Menu paths are written as `Settings › Tax Regions`. Steps marked
**(Super Admin)** need the owner's account.

---

## 1. Developer pre-flight

The store manager can't do these; whoever deploys must.

1. **Production environment.** Point `DATABASE_URL` at a fresh production
   database, not `youjaymharah-dev`. Set strong `JWT_SECRET` /
   `COOKIE_SECRET`, set the CORS variables to the real domains, and set
   `STORE_NAME`, `SUPPORT_EMAIL`, `STOREFRONT_URL` and `ADMIN_URL`.
2. **First admin.** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before migrating;
   the first migration creates this user as Super Admin. Hand the credentials
   to the store owner and have them change the password.
3. **Run `pnpm exec medusa db:migrate`.** The initial seed runs once and
   creates the records in section 2. Do **not** run `seed:demo` against
   production.
4. **Storefront key.** Copy the "Web Storefront" key from
   `Settings › Publishable API Keys` into the storefront's
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
5. **Payments live mode.** Set `CREDO_MODE=live` with live Credo keys,
   `CREDO_WEBHOOK_TOKEN` and `CREDO_BUSINESS_CODE`, and the live
   `PAYSTACK_SECRET_KEY`. Set `PAYMENT_CALLBACK_URL` to
   `https://<storefront>/checkout/callback`. Register webhooks at
   `https://<backend>/hooks/payment/paystack_paystack` and
   `https://<backend>/hooks/payment/credo_credo`. They complete orders for
   customers who pay but never return to the site.
6. **Image storage.** Fill the `S3_*` variables for Cloudflare R2 (see
   `apps/backend/.env.template`), or product image uploads will fail.
7. **Email.** Set `RESEND_API_KEY` and a `RESEND_FROM_EMAIL` on a domain
   verified in Resend. Order confirmation, shipping and cancellation emails,
   team invites and password resets all depend on it.

## 2. What already exists on day one

| Record                | Created as                                                         | You still need to                                       |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Store                 | "Youjaymharah", NGN default, USD secondary                         | Check the name; remove USD if you won't sell in dollars |
| Region                | Nigeria, NGN, payment providers: Manual, Credo, Paystack           | Decide on tax-inclusive pricing; remove Manual Payment  |
| Tax region            | Nigeria, no rate set (0%)                                          | Set 7.5% VAT                                            |
| Location              | Lagos Warehouse, city only, manual fulfilment                      | Add the full address; set up delivery options           |
| Sales channel         | Default Sales Channel, linked to the warehouse and storefront key  | Nothing, but every product must be in it                |
| Team roles            | Store Manager, Support / Fulfillment, Marketing (plus Super Admin) | Invite people with the right role                       |
| Branding & newsletter | Filled from environment settings on first open                     | Upload the logo; review the newsletter text             |

## 3. First-day setup

Work through these in order; each relies on the ones before it.

1. **Sign in and secure the owner account.** Open `/app` on the backend
   domain, sign in, change the password and add your name under
   `Settings › Profile`.
2. **Check store details and branding (Super Admin).** `Settings › Store`:
   confirm name and currencies (NGN stays the default). `Settings › Branding`:
   store name, logo and support email. All three appear in customer emails.
3. **Invite the team (Super Admin).** `Settings › Users › Invite`: enter the
   email, pick a role (see section 5) and send.
4. **Set VAT and choose how prices are shown.**
   - `Settings › Tax Regions › Nigeria`, default rate `⋯ › Edit`: name "VAT",
     rate **7.5**.
   - `Settings › Regions › Nigeria › ⋯ › Edit`: turn on **Tax inclusive
     pricing** if the prices you enter already include VAT (a ₦45,000 tag
     means ₦45,000 at checkout). Off means VAT is added at checkout.
   - Decide this **before** entering prices, and confirm with your accountant.
5. **Review payment methods.** `Settings › Regions › Nigeria › ⋯ › Edit`,
   field **Payment Providers**. Remove **Manual Payment** before launch: it lets
   customers place orders without paying. Paystack and Credo charge the
   customer on the gateway's page, so orders arrive already _captured_; you
   never press "Capture payment".
6. **Complete the warehouse and create delivery options.**
   1. `Settings › Locations & Shipping › Shipping Profiles`: make sure a
      default profile exists.
   2. Open **Lagos Warehouse** and add the full street address.
   3. **Shipping** section: `⋯ › Enable`, then **Create service zone**
      "Nigeria", and under **Manage areas** tick Nigeria.
   4. **Create option** per delivery speed: **Fixed** price, customer-facing
      name ("Standard delivery · 3–5 days"), the default shipping profile,
      **Manual** provider, **Enable in store** on, price in NGN.
   5. Optional: free delivery over a basket value via a conditional price
      (minimum cart total, e.g. ₦100,000 → ₦0).
   6. Optional: enable **Pickup** for showroom collection.
   - Different prices for Lagos and elsewhere: create two clearly named options
     ("Lagos delivery", "Outside Lagos"). Ask the developer for automatic
     pricing by state.
7. **Add return and refund reasons.** `Settings › Return Reasons` and
   `Settings › Refund Reasons`. Start with: Wrong size, Not as pictured,
   Damaged in delivery, Changed mind, Wrong item sent.
8. **Build the catalogue.**
   1. **Categories** first (`Products › Categories`), nested: Women › Dresses,
      Women › Accessories › Bags. Keep them Active and Public.
   2. **Collections** for edits and seasons.
   3. **Colours and sizes** are shared options (`Products › Options`):
      each colour is defined once and reused by every product. Open a colour
      value and use the **Swatch** panel to set its colour (or upload a
      fabric image for prints and stripes); that square is what shoppers
      click on the site. Add new colours and sizes here before using them.
   4. **Products**: title, description, images, then add the existing
      _Colour_ and _Size_ options and tick the values this product comes in;
      under **Organize** set category, collection, the default shipping
      profile and the **Default Sales Channel**; enter SKUs and NGN prices and
      keep **Managed inventory** on.
   5. **Colour photos** (optional): on a variant, **Media** lets you pick
      which product photos belong to that colour and its thumbnail. The site
      then shows only those photos once a shopper picks the colour.
   6. **Stock**: `Inventory`, pick the item, **Locations › ⋯ › Edit**, set the
      in-stock quantity at Lagos Warehouse. New products start with none.
   - A product missing from the site is usually a draft, missing from the
     Default Sales Channel, or has no stock at Lagos Warehouse.
   - Many products: `Products › Import` with a CSV (export one finished
     product first to copy its columns).
9. **Review newsletter sign-up.** `Settings › Newsletter`: consent text,
   success message, reply-to and the checkout label.
10. **Run one real test order end to end.** Buy a cheap item on the live site
    through Paystack; confirm the order, the captured payment and the
    confirmation email; fulfil, ship with tracking (check the shipping email),
    mark delivered; refund it in full and confirm the money returns.

## 4. Day-to-day playbooks

Every order task starts from `Orders` → open the order.

### Shipping an order and adding tracking

- **Only ship orders whose payment is Captured.** _Awaiting_ means the money
  hasn't landed yet, usually a Credo bank transfer in progress. The gateway
  updates it automatically when the transfer arrives.

1. **Unfulfilled items › ⋯ › Fulfill items**, check location and quantities,
   **Create fulfillment**.
2. When the courier collects: **Mark as shipped › Add tracking number** with
   the tracking number and URL.
3. When delivered: **Mark as delivered** (can't be undone).

With "Send notifications" on, **Mark as shipped** emails the customer the
tracking number and link. The customer's account page shows "Shipped" but not
the link, so point them to the email.
Guide: <https://docs.medusajs.com/user-guide/orders/fulfillments>

### Refunds

Check the order's **Payments** section for the provider.

- **Paystack:** payment `⋯ › Refund`, amount, reason, note, **Save**. Paystack
  returns the money to the card; settlement can take several working days.
- **Credo:** the Refund button shows "Credo refunds must be issued from the
  Credo dashboard". Refund there and record the Credo reference in your
  refunds log; the admin will still show the order as unrefunded.
- **Manual Payment / transfer:** send the money back, then record it with the
  refund form.

Refunds are final. Guide: <https://docs.medusajs.com/user-guide/orders/payments>

### Returns, size exchanges and damaged-item claims

Customers can't request these on the website yet; they contact you.

- **Return:** Summary `⋯ › Create Return`, add items, reason, location,
  **Confirm Return**. On arrival, **Receive items** (mark damaged pieces), then
  refund the outstanding amount.
- **Exchange:** return one item and send another (size swap); the difference
  is charged or refunded.
- **Claim:** wrong or damaged item sent; replace or refund without waiting for
  the return.

Guides: [Returns](https://docs.medusajs.com/user-guide/orders/returns) ·
[Exchanges](https://docs.medusajs.com/user-guide/orders/exchanges) ·
[Claims](https://docs.medusajs.com/user-guide/orders/claims)

### Editing or cancelling an order

Before shipping you can edit an order (swap a size, add or remove items). To
cancel, choose **Cancel** from the order's menu: reserved stock is released
and the customer is emailed that the order was cancelled and will be refunded.
Then refund the payment (manually for Credo).
Guides: [Edit](https://docs.medusajs.com/user-guide/orders/edit) ·
[Manage](https://docs.medusajs.com/user-guide/orders/manage)

### WhatsApp, Instagram and phone orders

Use **draft orders** so these sales share the website's stock.

1. `Orders › Drafts › Create`: region Nigeria, sales channel, customer email
   and address, **Save**.
2. Add items and a delivery option.
3. Once paid (e.g. transfer): **Convert to order**, then **Mark as paid** in
   the order summary.

Guides: [Draft orders](https://docs.medusajs.com/user-guide/orders/draft-orders) ·
[Create](https://docs.medusajs.com/user-guide/orders/draft-orders/create) ·
[Manage & convert](https://docs.medusajs.com/user-guide/orders/draft-orders/manage)

### In-store sales (POS)

Medusa has no built-in till app.

- **Now:** create a shop location (`Settings › Locations & Shipping › Create`)
  and ideally an "In-store" sales channel linked to it, so shop stock is
  separate and the website can't oversell. Record each sale as a draft order,
  take payment on your card terminal or by transfer, convert and **Mark as
  paid**.
- **Later:** a dedicated POS app on the same backend (barcode scanning,
  terminal integration, receipts) — a development project. See the
  [POS recipe](https://docs.medusajs.com/resources/recipes/pos) and
  [omnichannel recipe](https://docs.medusajs.com/resources/recipes/omnichannel).

### Promotions, codes and sales

- **Promo codes** (`Promotions › Create`): percentage or fixed off the order,
  specific products or delivery; restrict to categories, collections or
  customer groups.
- **Automatic promotions**, **Buy X get Y**, and **Campaigns** (dates and a
  budget by uses or amount).
- **Sales** (`Price Lists › Create`, type _Sale_): scheduled reduced prices,
  shown struck through on the site; can target a customer group.
- Codes also apply to items already on sale (they stack). To exclude sale
  items, restrict the promotion or turn off **Discountable** on those
  products.
- Free-delivery codes only stick once a delivery option is chosen.

Guides: [Promotions](https://docs.medusajs.com/user-guide/promotions/create) ·
[Campaigns](https://docs.medusajs.com/user-guide/promotions/campaigns) ·
[Price lists](https://docs.medusajs.com/user-guide/price-lists/create)

### Stock and reservations

Stock is per location. Placed orders **reserve** items until fulfilled, so the
available count can be lower than the shelf. Adjust under
`Inventory › item › Locations › ⋯ › Edit`.
Guides: [Inventory](https://docs.medusajs.com/user-guide/inventory/inventory) ·
[Reservations](https://docs.medusajs.com/user-guide/inventory/reservations)

### Customers, groups and exports

Customers and guest orders are under `Customers`. Use groups (VIP, stylists,
staff) to target promotions and price lists. Export orders and products to CSV
for bookkeeping. If a customer never received an email, a Super Admin can
check `Settings › Workflows` for the failed send.

## 5. Team roles

| Role                  | Can                                                                            | Can't                                                            |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Super Admin           | Everything, including users, API keys and branding                             | —                                                                |
| Store Manager         | Products, prices, stock, orders, customers, promotions, delivery, tax, regions | Invite users, manage API keys, change branding or store identity |
| Support / Fulfillment | Orders, fulfilment and tracking, returns, refunds, customer details            | Edit products or prices; any settings                            |
| Marketing             | Promotions, campaigns, price lists, collections and categories, newsletter     | See orders, payments or customer records                         |

## 6. Known gaps

| Area                                     | Status        | Meanwhile                                        |
| ---------------------------------------- | ------------- | ------------------------------------------------ |
| Tracking on customer's order page        | Status only   | The shipping email carries the tracking link     |
| Return, refund and exchange emails       | Not built     | Confirm to the customer yourself                 |
| Credo refunds                            | Manual        | Refund in the Credo dashboard; log the reference |
| Customer self-service returns            | Not built     | Customers contact support; you create the return |
| POS app                                  | Workaround    | Draft orders with a separate shop location       |
| Gift cards, store credit, loyalty points | Not available | One-off promo codes as a substitute              |
| Abandoned-cart reminders                 | Not built     | —                                                |

## 7. Medusa guides

The official [Medusa Admin user guide](https://docs.medusajs.com/user-guide)
covers every screen. Where it disagrees with this handbook, follow the
handbook: it reflects this store's setup.
