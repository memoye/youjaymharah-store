# @youjaymharah/api-types

TypeScript types for the backend's custom API routes (branding, newsletter,
wishlist, accounts), shared with the storefront.

`index.d.ts` is **generated** — do not edit it by hand. It is derived from the
same Zod schemas the backend validates requests with
(`apps/backend/src/api/middlewares.ts`), so a type here cannot describe a body
the server would reject.

```bash
cd apps/backend
pnpm run codegen              # regenerate types + docs/api/openapi.json
pnpm run codegen -- --check   # fail if either is out of date (CI)
```

## Using it from the storefront

```ts
import type {
  StoreAddWishlistItemBody,
  StoreWishlistResponse,
} from "@youjaymharah/api-types";

const body: StoreAddWishlistItemBody = { product_id: "prod_123" };

const { wishlist } = await getBrowserSdk().client.fetch<StoreWishlistResponse>(
  "/store/wishlists/current/items",
  { method: "POST", body },
);
```

For the wishlist itself, use the hooks in
`apps/storefront/features/wishlist/hooks.ts`, which wrap exactly this; see
`apps/storefront/DATA-LAYER.md`.

Types only: nothing here is imported at runtime, so the storefront bundle is
unaffected and no Zod copy is pulled in. Medusa's own endpoints are already
typed by `HttpTypes` in `@medusajs/types` — this package covers only the
routes this project added.
