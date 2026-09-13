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
come back when you pass a region.

```tsx
// app/products/[handle]/page.tsx
import { notFound } from "next/navigation";

import { sdk } from "@/lib/medusa/server";

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const { handle } = await params;

  const { regions } = await sdk.store.region.list();
  const region = regions[0]; // one region (Nigeria) today

  const { products } = await sdk.store.product.list({
    handle,
    region_id: region.id,
    fields: "*variants.calculated_price",
  });

  const product = products[0];

  if (!product) {
    notFound();
  }

  return <h1>{product.title}</h1>;
}
```

Keep catalogue pages away from cookies: calling `getAuthHeaders()` (or anything
that reads cookies) makes the whole page render per request instead of being
cached. Show customer-specific bits, like "in your wishlist", from a Client
Component instead.

Prices are stored as-is: ₦49.99 comes back as `49.99`. Never divide by 100.

For the "New" badge, call `isNew(product)` from `lib/medusa/product.ts` here,
in the Server Component, and pass the boolean to the card. It needs
`+metadata` in `fields`, and counts 30 days from the launch date (or creation
date).

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
import type { StoreSearchResponse } from "@youjaymharah/api-types";
import { queryOptions } from "@tanstack/react-query";

import { getBrowserSdk } from "@/lib/medusa/browser";
import { type CatalogContext, queryKeys } from "@/lib/query/keys";

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
};
```

**Step 3: use it** in a Client Component:

```tsx
"use client";

const { data, isPending, error } = useQuery(
  searchQueries.results(term, context),
);
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
};
```

To know whether someone is signed in, use `useCustomer()`:

```tsx
const { data: customer } = useCustomer();
// undefined: still loading · null: guest · object: signed in
```

### 4. Rendering with data already loaded (server prefetch)

When the first paint needs private data (the cart page, the header's "Hi, Ada"),
prefetch it on the server and hand it to the client cache. The client component
then renders immediately and React Query takes over.

```tsx
// app/cart/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { cartQueries } from "@/features/cart/queries";
import { fetchCartOnServer } from "@/features/cart/server";
import { getQueryClient } from "@/lib/query/client";

import { CartView } from "./cart-view"; // a Client Component using useCart()

export default async function CartPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    ...cartQueries.current(),
    queryFn: fetchCartOnServer, // same key, server-side fetch
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CartView />
    </HydrationBoundary>
  );
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
"use client";

import { useAddToCart } from "@/features/cart/hooks";

export function AddToCartButton({ variantId }: { variantId: string }) {
  const addToCart = useAddToCart();

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
  );
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
"use client";

import {
  useRemoveFromWishlist,
  useSaveToWishlist,
  useWishlistItem,
} from "@/features/wishlist/hooks";

export function HeartButton({ productId }: { productId: string }) {
  const { item, isSaved, isPending } = useWishlistItem(productId);
  const save = useSaveToWishlist();
  const remove = useRemoveFromWishlist();

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
  );
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
"use client";

import { useCustomer } from "@/features/customer/hooks";
import {
  useCreateProductAlert,
  useWaitingProductAlert,
} from "@/features/product-alerts/hooks";

const { data: customer } = useCustomer();
const notify = useCreateProductAlert();
const waiting = useWaitingProductAlert(productId, variantId); // signed in only

notify.mutate({
  product_id: productId,
  variant_id: variantId, // omit to wait on any size
  email: customer ? undefined : email, // guests only; ignored when signed in
  marketing_opt_in: wantsOffers, // the separate "send me offers" box
});
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

### 6. Signing in and out

```tsx
const login = useLogin();
login.mutate({ email, password }); // login.error.message on failure

const register = useRegister();
register.mutate({ email, password, first_name, last_name });

const logout = useLogout();
logout.mutate();
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
| `POST /store/customers/me/password`              | `StoreSetCustomerPasswordResponse` |
| `POST /store/newsletter/subscribe`               | `StoreNewsletterAckResponse`       |
| `POST /store/newsletter/confirm`, `/unsubscribe` | `StoreNewsletterAckResponse`       |

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

## Errors

Every failed call throws the SDK's `FetchError`, whether it came from Medusa
or from the storefront's own routes. Check it with the helpers in
`lib/medusa/errors.ts`:

```ts
import { errorStatus, isNotFound, isUnauthorized } from "@/lib/medusa/errors";
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

| File                                | What it is                                                      |
| ----------------------------------- | --------------------------------------------------------------- |
| `lib/medusa/server.ts`              | Server SDK, `getAuthHeaders()`                                  |
| `lib/medusa/browser.ts`             | Browser SDK (through the proxy)                                 |
| `lib/medusa/session.ts`             | Reading and writing the auth, cart and wishlist cookies         |
| `lib/medusa/errors.ts`              | `errorStatus`, `isUnauthorized`, `isNotFound`, `isClientError`  |
| `lib/medusa/auth.ts`                | Shared sign-in logic for the auth routes                        |
| `lib/query/keys.ts`                 | Every query key, and `privateQueryRoots`                        |
| `lib/query/client.ts`               | Query client defaults                                           |
| `lib/query/provider.tsx`            | Provider and devtools, mounted in `app/layout.tsx`              |
| `lib/http/post-json.ts`             | `postJson` for the storefront's own routes                      |
| `lib/http/same-origin.ts`           | CSRF check for Route Handlers                                   |
| `app/api/medusa/[...path]/route.ts` | The proxy                                                       |
| `app/api/auth/*`                    | Login, register, logout, Google                                 |
| `features/cart/`                    | Cart queries, hooks and server prefetch (worked example)        |
| `features/customer/`                | Customer query, auth hooks and server prefetch (worked example) |
| `features/wishlist/`                | Wishlist query, save/remove hooks and server prefetch           |
| `features/product-alerts/`          | "Notify me" hooks and the customer's alert list                 |
| `features/marketing/`               | The account's marketing email setting                           |
| `lib/medusa/product.ts`             | `isComingSoon`, `isNew`, `onSaleSince`                          |
