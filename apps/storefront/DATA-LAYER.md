# Storefront Data Layer

How to fetch and change Medusa data in this storefront. Read it once before
building a feature; the recipes below cover almost every screen in
`docs/storefront-build-order.md`.

For how this is deployed, see `DEPLOY.md`.

## The three rules

**1. Where the code runs decides which SDK you use.**

| You are writing                                    | Use                                                      | Why                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A Server Component or Route Handler                | `sdk` from `@/lib/medusa/server`                         | Calls Medusa directly, server to server                                              |
| A Client Component, or a React Query `queryFn`     | `getBrowserSdk()` from `@/lib/medusa/browser`            | Goes through this app's `/api/medusa` proxy, which adds the customer's token for you |
| Customer data on the server (orders, account page) | `sdk` plus `await getAuthHeaders()` as the last argument | The server SDK never holds a token; you pass it per request                          |

**2. Browser code never touches tokens.** Sign customers in with the hooks in
`features/customer/hooks.ts`. Never call `sdk.auth.*` from a Client Component:
login returns the token in the response body, which is exactly what this setup
keeps out of the browser.

**3. Every query key comes from `lib/query/keys.ts`.** Server prefetches and
client hooks share it, so they cannot drift apart. Any key whose response has
prices or translated text must include the region and locale
(`CatalogContext`).

## Local setup

1. Copy `apps/storefront/.env.template` to `apps/storefront/.env.local`.
2. Set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` to the "Web Storefront" key from
   `Settings › Publishable API Keys` in the admin. Leave `MEDUSA_BACKEND_URL` as
   `http://localhost:9000`.
3. Run the backend (`pnpm run backend:dev`) and the storefront
   (`pnpm run storefront:dev`, on <http://localhost:8000>).

`NEXT_PUBLIC_*` values are baked in at build time: restart `next dev` after
changing one.

## Recipes

### 1. Public page data (Server Component)

Product lists, product pages and categories render on the server. Prices only
come back when you pass a region: get it from `getStoreRegion()`.

```tsx
// app/(main)/products/[handle]/page.tsx
import { notFound } from "next/navigation"

import { getStoreRegion } from "@/lib/medusa/region"
import { sdk } from "@/lib/medusa/server"

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const { handle } = await params

  const region = await getStoreRegion() // fetched once per request

  const { products } = await sdk.store.product.list({
    handle,
    region_id: region.id,
    fields: "*variants.calculated_price",
  })

  const product = products[0]

  if (!product) {
    notFound()
  }

  return <h1>{product.title}</h1>
}
```

Keep catalogue pages away from cookies: calling `getAuthHeaders()` (or anything
that reads cookies) makes the whole page render per request instead of being
cached. Show customer-specific bits, like "in your wishlist", from a Client
Component instead.

Prices are stored as-is: ₦49.99 comes back as `49.99`. Never divide by 100.

For the "New" badge, call `isNew(product, newBadgeDays)` from
`lib/medusa/product.ts` here, in the Server Component, and pass the boolean to
the card. `newBadgeDays` is staff's setting under Settings › Storefront:
`(await getStorefrontSettings()).products.new_badge_days`, fetched once per request. It
needs `+metadata` in `fields`, and counts from the launch date (or creation
date).

#### Catalogue helpers

Prefer these to hand-written `sdk.store.*` calls. They add the region, the
right `fields` and short, tagged caching, and read no cookies.

```tsx
// app/(main)/products/[handle]/page.tsx
import { notFound } from "next/navigation"

import { getProductByHandle } from "@/lib/medusa/catalog"
import { formatPrice, getProductPrice } from "@/lib/medusa/price"
import { getColourChoices, getSizeChoices } from "@/lib/medusa/variants"

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const product = await getProductByHandle((await params).handle)

  if (!product) {
    notFound()
  }

  const price = getProductPrice(product)

  return (
    <>
      <h1>{product.title}</h1>
      {price && (
        <p>
          {price.isRange && "From "}
          {formatPrice(price.price.amount, price.price.currencyCode)}
          {price.price.isOnSale && (
            <s>
              {formatPrice(
                price.price.originalAmount,
                price.price.currencyCode,
              )}
            </s>
          )}
        </p>
      )}
    </>
  )
}
```

- **Listings:** `listProducts()` takes `categoryId`, `collectionId`, `order`
  (such as `"-created_at"`), `limit` and `offset`, and returns
  `{ products, count }` with card fields: price, stock, swatches and
  `+metadata` for the New badge.
- **Navigation and category pages:** `getCategoryTree()` for menus;
  `getCategoryByHandle(handle)` returns the category with its parents, so
  `getCategoryTrail(category)` builds breadcrumbs without another request.
  `getCategorySeo(category)` gives its page title and description.
- **Collections:** `getCollectionByHandle(handle)` or `getCollectionById(id)`
  (for the home page's featured collection), then `getCollectionContent()` for
  the description and banner images.
- **Search:** `searchProducts({ q, category, limit })` searches, then loads the
  hits as priced products in relevance order.
- **Swatches and sizes:** `getColourChoices(product, selection)` and
  `getSizeChoices(product, selection)` list only the values this product comes
  in, in the admin's order, with `hex` or `swatchImage` and whether each is
  available alongside the other choices.
- **Stock:** `getVariantStock(variant, product)` returns `in_stock`,
  `low_stock` (3 or fewer), `backorder`, `sold_out` or `coming_soon`.
  `canPurchase(status)` decides between Add to bag and Notify me.
- **Photos:** `getSelectionImages(product, selection)` follows the chosen
  colour and falls back to the product gallery.
- **In the browser:** `useProductSelection(product)` keeps `?colour=` and
  `?size=` in the URL and returns `{ selection, variant, setOption }`. It reads
  `useSearchParams`, so wrap the component using it in `<Suspense>`.
- **Metadata:** read staff-edited fields with `metaText()` and `metaImage()`.
  The admin saves cleared fields as `""`.
- **Refreshing:** responses are tagged `products`, `product:<handle>`,
  `categories` and `collections` (`CATALOG_TAGS`) for `revalidateTag`.

Run the helper tests with `pnpm test`.

### 2. Client-side data with React Query

For anything that changes as the customer interacts, like search-as-you-type.

**Step 1: add the key** to `lib/query/keys.ts`:

```ts
search: {
  all: ["search"] as const,
  results: (q: string, context: CatalogContext) =>
    [...queryKeys.search.all, q, context] as const,
},
```

**Step 2: define the query** next to the feature, in
`features/<feature>/queries.ts`:

```ts
import type { StoreSearchResponse } from "@youjaymharah/api-types"
import { queryOptions } from "@tanstack/react-query"

import { getBrowserSdk } from "@/lib/medusa/browser"
import { type CatalogContext, queryKeys } from "@/lib/query/keys"

export const searchQueries = {
  results: (q: string, context: CatalogContext) =>
    queryOptions({
      queryKey: queryKeys.search.results(q, context),
      queryFn: () =>
        getBrowserSdk().client.fetch<StoreSearchResponse>("/store/search", {
          query: { q, limit: 8 },
        }),
      enabled: q.trim().length > 1,
    }),
}
```

**Step 3: use it** in a Client Component:

```tsx
"use client"

const { data, isPending, error } = useQuery(
  searchQueries.results(term, context),
)
```

### 3. Customer-only data

Mark queries that need a signed-in customer with `meta: { private: true }`. If
one returns 401 (the session expired), the query client marks the customer as
signed out everywhere.

```ts
// lib/query/keys.ts
orders: {
  all: ["orders"] as const,
  list: (page: number) => [...queryKeys.orders.all, "list", page] as const,
},
```

Add `queryKeys.orders.all` to `privateQueryRoots` in the same file, so logging
out removes it.

```ts
// features/orders/queries.ts
export const orderQueries = {
  list: (page: number) =>
    queryOptions({
      queryKey: queryKeys.orders.list(page),
      queryFn: () =>
        getBrowserSdk().store.order.list({ limit: 10, offset: page * 10 }),
      meta: { private: true },
    }),
}
```

To know whether someone is signed in, use `useCustomer()`:

```tsx
const { data: customer } = useCustomer()
// undefined: still loading · null: guest · object: signed in
```

### 4. Rendering with data already loaded (server prefetch)

When the first paint needs private data (the cart page, the header's "Hi, Ada"),
prefetch it on the server and hand it to the client cache. The client component
then renders immediately and React Query takes over.

```tsx
// app/cart/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { cartQueries } from "@/features/cart/queries"
import { fetchCartOnServer } from "@/features/cart/server"
import { getQueryClient } from "@/lib/query/client"

import { CartView } from "./cart-view" // a Client Component using useCart()

export default async function CartPage() {
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    ...cartQueries.current(),
    queryFn: fetchCartOnServer, // same key, server-side fetch
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CartView />
    </HydrationBoundary>
  )
}
```

- Spread the **same** query options and override only `queryFn`. The keys must
  match or the client refetches.
- `features/customer/server.ts` has `fetchCustomerOnServer` for the customer.
- Hydrated data stays fresh for 60 seconds (`staleTime`), so the client does
  not refetch it immediately.
- For streaming, call `void queryClient.prefetchQuery(...)` without `await` and
  wrap the client component in `<Suspense>`. Pending queries are already
  configured to stream through.
- Only use `useSuspenseQuery` for data you prefetch like this. Otherwise it
  runs the browser `queryFn` during server rendering, where `getBrowserSdk()`
  throws.

### 5. Changing data

**Using the cart hooks** (`features/cart/hooks.ts`):

```tsx
"use client"

import { useAddToCart } from "@/features/cart/hooks"

export function AddToCartButton({ variantId }: { variantId: string }) {
  const addToCart = useAddToCart()

  return (
    <>
      <button
        disabled={addToCart.isPending}
        onClick={() => addToCart.mutate({ variantId })}
      >
        {addToCart.isPending ? "Adding…" : "Add to bag"}
      </button>
      {addToCart.error && <p>{addToCart.error.message}</p>}
    </>
  )
}
```

`useAddToCart` creates the cart when there is none. `useUpdateLineItem` and
`useRemoveLineItem` update the screen immediately and roll back if Medusa
refuses (for example, out of stock).

**Writing your own mutation.** Follow the cart hooks:

- Let `mutationFn` throw on failure. The SDK already does, and `postJson` does
  for the storefront's own routes.
- When Medusa returns the updated resource, write it into the cache with
  `queryClient.setQueryData` instead of refetching.
- For an optimistic update: in `onMutate`, cancel the query, save the current
  value and set the new one; in `onError`, restore the saved value.
- If several writes to the same resource can overlap, give them one
  `mutationKey` and only write a response into the cache when it is the last
  one in flight. See `settleCart` in `features/cart/hooks.ts`.
- Do not make prices or totals optimistic. Medusa calculates tax and
  promotions, so a guess would disagree with the real number.

`features/wishlist/hooks.ts` is a second worked example, calling this project's
custom routes with `sdk.client.fetch` (plain object body, no `JSON.stringify`).

**Using the wishlist hooks.** They work the same for guests and signed-in
customers; there is nothing to check first.

```tsx
"use client"

import {
  useRemoveFromWishlist,
  useSaveToWishlist,
  useWishlistItem,
} from "@/features/wishlist/hooks"

export function HeartButton({ productId }: { productId: string }) {
  const { item, isSaved, isPending } = useWishlistItem(productId)
  const save = useSaveToWishlist()
  const remove = useRemoveFromWishlist()

  return (
    <button
      aria-pressed={isSaved}
      disabled={isPending}
      onClick={() =>
        item ? remove.mutate(item) : save.mutate({ product_id: productId })
      }
    >
      {isSaved ? "Saved" : "Save"}
    </button>
  )
}
```

- On the product page, pass the chosen variant:
  `save.mutate({ product_id, variant_id })`. Saving an already-saved product
  with a `variant_id` updates it to that colour and size.
- Both hooks update the heart immediately and roll back on failure. Keep the
  button disabled while `isPending`: a just-saved item has no real id to remove
  yet.
- `useWishlist()` returns the whole list as ids, newest first. Load the products
  with the regular product queries, so region pricing applies and unpublished
  products drop out.
- A guest's first save creates their list, kept in an httpOnly cookie for 90
  days from the last save. The backend deletes guest lists after the same 90
  days.

**"Notify me" and marketing email** (`features/product-alerts/hooks.ts`,
`features/marketing/hooks.ts`). Show "Notify me" instead of "Add to bag" when
`isComingSoon(product)` (from `lib/medusa/product.ts`; request `+metadata`) or
the chosen size is sold out.

```tsx
"use client"

import { useCustomer } from "@/features/customer/hooks"
import {
  useCreateProductAlert,
  useWaitingProductAlert,
} from "@/features/product-alerts/hooks"

const { data: customer } = useCustomer()
const notify = useCreateProductAlert()
const waiting = useWaitingProductAlert(productId, variantId) // signed in only

notify.mutate({
  product_id: productId,
  variant_id: variantId, // omit to wait on any size
  email: customer ? undefined : email, // guests only; ignored when signed in
  marketing_opt_in: wantsOffers, // the separate "send me offers" box
})
```

- Nobody is emailed at signup. One email goes out within about 10 minutes of
  the item becoming buyable, then the alert is done.
- A guest's response has `alert: null`, so show "We'll email you" on success.
  A signed-in customer's alert appears in `useProductAlerts()`; cancel with
  `useCancelProductAlert()`.
- A 400 "This item is available to buy now." means stock came back: refetch
  the product and show "Add to bag".
- The offers box and the account setting (`useMarketingPreference()`,
  `useSetMarketingPreference()`) use the newsletter's double opt-in: turning it
  on usually returns `status: "pending"`, so say "Check your inbox to confirm".
- Adding a coming-soon product to a cart fails with a 400 whose message says
  so.

**Size guide** (`features/size-guide/`, `lib/medusa/size-guide.ts`). Fetch it
on the server with the product. It reads no cookies, so the page stays cached.

```tsx
// In the product page's Server Component
const { size_guide } = await fetchSizeGuideOnServer(product.id)
// null when no guide applies: hide the "Size guide" link.
```

```tsx
"use client"

import { useMeasurementUnit } from "@/features/size-guide/use-measurement-unit"
import {
  findSizeGuideRow,
  formatSizeGuideCell,
  sizeGuideColumnHeading,
} from "@/lib/medusa/size-guide"

const [unit, setUnit] = useMeasurementUnit() // "cm" | "in", remembered
const selectedRow = findSizeGuideRow(guide, selectedSize)

sizeGuideColumnHeading(column, unit) // "Bust (cm)" or "UK size"
formatSizeGuideCell(column, row.values[column.key], unit) // "86–90" or "34–35.5"
```

- Measurements arrive in cm. In inches they round to the nearest half inch.
- Rows use the shared Size option's values, so the chosen variant's size
  matches a row exactly: highlight `selectedRow`.
- Show `description` (how to measure) and `diagram_url` above the table when
  present.
- The toggle renders "cm" on the server, then switches to the shopper's saved
  choice after hydration.

### 6. Signing in and out

```tsx
const login = useLogin()
login.mutate({ email, password }) // login.error.message on failure

const register = useRegister()
register.mutate({ email, password, first_name, last_name })

const logout = useLogout()
logout.mutate()
```

- After signing in, a guest cart moves to the customer, a guest wishlist is
  merged into the customer's, private queries refetch, and Server Components
  re-render (`router.refresh()`). Where both lists hold a product, the
  customer's saved colour and size win.
- Logging out deletes the auth, cart and wishlist cookies and removes private
  queries from the cache, so nothing from the previous customer is left on
  screen.
- Wrong credentials come back as Medusa's message ("Invalid email or
  password") in `error.message`.
- Sessions last one day, then the customer signs in again (see `DEPLOY.md`).

**Google:** link to the route; it handles the rest.

```tsx
<a href="/api/auth/google">Continue with Google</a>
```

On failure, the customer lands on `/` with `?auth_error=` set to
`google_unavailable` (Google is not configured), `google_cancelled` (they backed
out) or `google_failed`. Show a message for it on the home page.

### 7. Language and region

- **Server:** pass the locale as a header on each call:
  `sdk.store.product.list(query, { "x-medusa-locale": locale })`.
- **Browser:** set it once with `getBrowserSdk().client.setLocale(locale)`. It is
  remembered in `localStorage` and sent with every request.
- Put `regionId` and `locale` in the query key (`CatalogContext`) of anything
  that returns prices or translated text.

### 8. The project's own backend routes

Call them with `sdk.client.fetch` and type the responses from
`@youjaymharah/api-types`. Full reference: `docs/api/README.md`.

| Route                                            | Response type                      |
| ------------------------------------------------ | ---------------------------------- |
| `GET /store/search`                              | `StoreSearchResponse`              |
| `GET /store/wishlists/current`                   | `StoreWishlistResponse`            |
| `POST /store/wishlists/current/items`            | `StoreWishlistResponse`            |
| `DELETE /store/wishlists/current/items/{id}`     | `StoreWishlistResponse`            |
| `POST /store/products/{id}/alerts`               | `StoreCreateProductAlertResponse`  |
| `GET /store/customers/me/product-alerts`         | `StoreProductAlertsResponse`       |
| `DELETE /store/customers/me/product-alerts/{id}` | `{ id, object, deleted }`          |
| `GET`, `POST /store/customers/me/marketing`      | `StoreMarketingPreferenceResponse` |
| `GET /store/products/{id}/size-guide`            | `StoreSizeGuideResponse`           |
| `POST /store/customers/me/password`              | `StoreSetCustomerPasswordResponse` |
| `POST /store/newsletter/subscribe`               | `StoreNewsletterAckResponse`       |
| `POST /store/newsletter/confirm`, `/unsubscribe` | `StoreNewsletterAckResponse`       |
| `POST /store/cart-reminders/restore`             | `StoreRestoreCartResponse`         |
| `POST /store/cart-reminders/stop`                | `StoreStopCartRemindersResponse`   |

**Bag reminder emails** link to two storefront addresses:

- `/shopping-bag/restore?token=` is already built
  (`app/(main)/shopping-bag/restore/route.ts`). It restores the bag as the
  browser's cart and opens `/shopping-bag`. When restoring fails, it adds
  `?restore=expired`, `invalid` or `failed`, so show a short message on the
  shopping bag page. The restored bag replaces whatever cart that browser had.
- `/shopping-bag/reminders/stop?token=` is still to build. Show a "Stop bag
  reminders" button that calls `useStopCartReminders()` from
  `features/cart-reminders/hooks.ts`. Don't stop on page load: email scanners
  open links first. A 404 means the link is no longer valid.

`/store/wishlists/current` exists only in the proxy. It becomes the customer's
list (`/store/customers/me/wishlist`) when signed in, and the guest list in the
cookie (`/store/wishlists/{id}`) otherwise, so browser code never picks between
them or handles a wishlist id. Use the hooks rather than calling it directly.

### 9. When to add a Route Handler

Almost never: the proxy covers every `/store/*` call. Add one under `app/api/`
only when the server must **set or clear a cookie**, or use a **secret**. Then:

- Call `isSameOrigin(request)` first in anything that is not a `GET`, and return
  `crossOriginRefused()` if it fails.
- Use `sdk` and `getAuthHeaders()`, and never put a token in the response.
- Change cookies only through `lib/medusa/session.ts`. Next.js refuses to set
  cookies while a Server Component renders, so this only works in Route
  Handlers.

If Medusa needs a request header the proxy does not forward yet, add it to
`FORWARDED_REQUEST_HEADERS` in `app/api/medusa/[...path]/route.ts`.

### 10. Page metadata and structured data

Site-wide defaults are already set in `app/layout.tsx` from Settings ›
Storefront. Each page adds what it knows better.

```tsx
// app/(main)/products/[handle]/page.tsx
import { JsonLd } from "@/components/seo/json-ld"
import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/json-ld"
import { buildProductMetadata } from "@/lib/seo/metadata"

export async function generateMetadata({
  params,
}: PageProps<"/products/[handle]">) {
  const product = await getProduct((await params).handle) // wrap in React.cache
  return buildProductMetadata(product, await getStorefrontSettings())
}

// In the page component:
;<JsonLd
  data={[
    productJsonLd(product, region.currency_code, settings),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: category.name, path: categoryPath(category.handle) },
      { name: product.title, path: productPath(product.handle) },
    ]),
  ]}
/>
```

- Fetch the product with `+metadata` (staff's per-product title and
  description), `*variants.calculated_price` and `+variants.inventory_quantity`
  (price and stock for structured data).
- `generateMetadata` and the page both need the product: wrap the fetch in
  `React.cache` so it runs once.
- Category pages: staff can set `seo_title` and `seo_description` in the
  category's **Search & sharing** box, stored in `category.metadata`. Return
  `{ title: metadata.seo_title || category.name, description:
metadata.seo_description || category.description }`, requesting `+metadata`.
  Collections have no box yet, so use their title. The layout adds " | Store
  name".
- Page addresses live in `lib/seo/routes.ts`. The sitemap, canonical links and
  structured data use them, so change them there if the routes differ.
- `getStorefrontSettings()` is cached for 5 minutes. If the backend is
  unreachable it logs and falls back to defaults rather than failing the page.
- Check pages with Google's Rich Results Test once they are deployed.

## Errors

Every failed call throws the SDK's `FetchError`, whether it came from Medusa
or from the storefront's own routes. Check it with the helpers in
`lib/medusa/errors.ts`:

```ts
import { errorStatus, isNotFound, isUnauthorized } from "@/lib/medusa/errors"
```

- `error.message` is safe to show: it is Medusa's own message, or a generic one
  for server errors.
- React Query does not retry 4xx errors, retries other queries up to twice, and
  never retries mutations.

## Troubleshooting

| Symptom                                    | Cause                                                                    | Fix                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 400 "Publishable API key required"         | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` missing when the app was built      | Set it and restart or rebuild                              |
| "getBrowserSdk() is browser-only"          | Called from a Server Component, or `useSuspenseQuery` without a prefetch | Use `sdk` from `lib/medusa/server`, or prefetch (recipe 4) |
| 404 "No active cart."                      | No cart yet                                                              | Expected; `useAddToCart` creates one                       |
| 403 "Cross-origin request refused."        | The request did not come from a storefront page                          | Call it from the storefront itself                         |
| 502 "The store is temporarily unavailable" | Backend down, or `MEDUSA_BACKEND_URL` is wrong                           | Check the backend's `/health`                              |
| Products have no prices                    | No `region_id` in the request                                            | Pass the region (recipe 1)                                 |
| The screen doesn't update after a change   | The mutation neither wrote its response nor invalidated the query        | `setQueryData` with the response (recipe 5)                |
| Customers are signed out every day         | Tokens last one day                                                      | See "Sessions last one day" in `DEPLOY.md`                 |

The browser's Network tab shows a `Server-Timing` header on every proxied call,
with how long Medusa took to answer.

## File map

| File                                | What it is                                                                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/medusa/server.ts`              | Server SDK, `getAuthHeaders()`                                                                                                                                                                                                                |
| `lib/medusa/browser.ts`             | Browser SDK (through the proxy)                                                                                                                                                                                                               |
| `lib/medusa/session.ts`             | Reading and writing the auth, cart and wishlist cookies                                                                                                                                                                                       |
| `lib/medusa/errors.ts`              | `errorStatus`, `isUnauthorized`, `isNotFound`, `isClientError`                                                                                                                                                                                |
| `lib/medusa/auth.ts`                | Shared sign-in logic for the auth routes                                                                                                                                                                                                      |
| `lib/query/keys.ts`                 | Every query key, and `privateQueryRoots`                                                                                                                                                                                                      |
| `lib/query/client.ts`               | Query client defaults                                                                                                                                                                                                                         |
| `lib/query/provider.tsx`            | Provider and devtools, mounted in `app/layout.tsx`                                                                                                                                                                                            |
| `lib/http/post-json.ts`             | `postJson` for the storefront's own routes                                                                                                                                                                                                    |
| `lib/http/same-origin.ts`           | CSRF check for Route Handlers                                                                                                                                                                                                                 |
| `app/api/medusa/[...path]/route.ts` | The proxy                                                                                                                                                                                                                                     |
| `app/api/auth/*`                    | Login, register, logout, Google                                                                                                                                                                                                               |
| `features/cart/`                    | Cart queries, hooks and server prefetch (worked example)                                                                                                                                                                                      |
| `features/customer/`                | Customer query, auth hooks and server prefetch (worked example)                                                                                                                                                                               |
| `features/wishlist/`                | Wishlist query, save/remove hooks and server prefetch                                                                                                                                                                                         |
| `features/product-alerts/`          | "Notify me" hooks and the customer's alert list                                                                                                                                                                                               |
| `features/marketing/`               | The account's marketing email setting                                                                                                                                                                                                         |
| `lib/medusa/product.ts`             | `isComingSoon`, `isNew`, `onSaleSince`                                                                                                                                                                                                        |
| `lib/medusa/storefront-settings.ts` | `getStorefrontSettings()`: brand, home page hero and featured collection, sharing & search, New badge days                                                                                                                                    |
| `lib/seo/metadata.ts`               | `buildRootMetadata`, `buildProductMetadata`                                                                                                                                                                                                   |
| `lib/seo/json-ld.ts`                | Organization, WebSite, Product and breadcrumb structured data                                                                                                                                                                                 |
| `lib/seo/routes.ts`                 | Public page paths used by the sitemap and structured data                                                                                                                                                                                     |
| `components/seo/json-ld.tsx`        | `<JsonLd>`: renders structured data safely                                                                                                                                                                                                    |
| `app/robots.ts`, `app/sitemap.ts`   | robots.txt and sitemap.xml                                                                                                                                                                                                                    |
| `app/manifest.ts`                   | Home-screen web app manifest (brand name, description, favicon)                                                                                                                                                                               |
| `lib/medusa/region.ts`              | `getStoreRegion()`: the region prices come from                                                                                                                                                                                               |
| `lib/medusa/catalog.ts`             | Server reads: `getProductByHandle`, `listProducts`, `getCategoryTree`, `getCategoryByHandle`, `listCollections`, `getCollectionByHandle`, `getCollectionById`, `searchProducts`; `PRODUCT_CARD_FIELDS`, `PRODUCT_PAGE_FIELDS`, `CATALOG_TAGS` |
| `lib/medusa/price.ts`               | `formatPrice`, `getVariantPrice`, `getProductPrice` (sale, percent off, "From" ranges)                                                                                                                                                        |
| `lib/medusa/variants.ts`            | `getColourChoices`, `getSizeChoices`, `getOptionChoices`, `findVariant`, `getVariantStock`, `canPurchase`, `isVariantPurchasable`, `getSelectionImages`                                                                                       |
| `lib/medusa/category.ts`            | `getCategoryTrail` (breadcrumbs), `sortCategoryTree`, `getCategorySeo`                                                                                                                                                                        |
| `lib/medusa/collection.ts`          | `getCollectionContent`: description and banner images, cleaned                                                                                                                                                                                |
| `lib/medusa/metadata.ts`            | `metaText`, `metaImage`: read staff-edited metadata safely                                                                                                                                                                                    |
| `features/product-selection/`       | `useProductSelection`: colour and size kept in the URL                                                                                                                                                                                        |
| `lib/medusa/menu.ts`                | `getMenuModel` (departments, columns, the "Clothing" group), `getMenuGroups`, `getCollectionMenu`, `getBreadcrumbs`, `findActiveMenuItem`                                                                                                     |
| `features/catalog/`                 | `CatalogProvider` / `useCatalog()` (menu data built in the root layout), `useActiveMenuItem()`                                                                                                                                                |
| `components/layout/`                | Header, desktop mega menu (on `components/ui/navigation-menu`), mobile drawer menu                                                                                                                                                            |
| `features/size-guide/`              | Size guide query, server fetch and the cm/inches hook                                                                                                                                                                                         |
| `lib/medusa/size-guide.ts`          | Formatting size guide cells in cm or inches                                                                                                                                                                                                   |
