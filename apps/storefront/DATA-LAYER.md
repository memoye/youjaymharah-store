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

Example: saving to the wishlist through this project's custom routes, and
writing the response into the cache. It assumes a `wishlist` entry in
`lib/query/keys.ts` (`all` and `current()`), added the same way as the orders
keys in recipe 3.

```ts
import type { StoreWishlistResponse } from "@youjaymharah/api-types";

export function useSaveToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["wishlist"],
    mutationFn: (productId: string) =>
      getBrowserSdk().client.fetch<StoreWishlistResponse>(
        "/store/customers/me/wishlist/items",
        { method: "POST", body: { product_id: productId } }, // no JSON.stringify
      ),
    onSuccess: ({ wishlist }) =>
      queryClient.setQueryData(queryKeys.wishlist.current(), wishlist),
  });
}
```

### 6. Signing in and out

```tsx
const login = useLogin();
login.mutate({ email, password }); // login.error.message on failure

const register = useRegister();
register.mutate({ email, password, first_name, last_name });

const logout = useLogout();
logout.mutate();
```

- After signing in, a guest cart moves to the customer, private queries
  refetch, and Server Components re-render (`router.refresh()`).
- Logging out deletes the auth and cart cookies and removes private queries
  from the cache, so nothing from the previous customer is left on screen.
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
| `GET /store/customers/me/wishlist`               | `StoreWishlistResponse`            |
| `POST /store/customers/me/wishlist/items`        | `StoreWishlistResponse`            |
| `DELETE /store/customers/me/wishlist/items/{id}` | `StoreWishlistResponse`            |
| `POST /store/customers/me/password`              | `StoreSetCustomerPasswordResponse` |
| `POST /store/newsletter/subscribe`               | `StoreNewsletterAckResponse`       |
| `POST /store/newsletter/confirm`, `/unsubscribe` | `StoreNewsletterAckResponse`       |

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
| `lib/medusa/session.ts`             | Reading and writing the auth and cart cookies                   |
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
