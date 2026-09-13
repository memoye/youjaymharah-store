/**
 * Every React Query key in the app, in one place. Server prefetches and client
 * hooks import from here, so the two can never drift apart.
 *
 * Keys are hierarchical: invalidating a root (e.g. `queryKeys.cart.all`)
 * invalidates everything beneath it.
 */

/**
 * What changes the content of a catalogue response. Prices depend on the region,
 * and with translations on, text depends on the locale -- a key without either
 * would serve one region's prices or one language's copy to everyone.
 */
export type CatalogContext = {
  regionId: string;
  locale: string;
};

export const queryKeys = {
  customer: {
    all: ["customer"] as const,
    me: () => [...queryKeys.customer.all, "me"] as const,
  },
  cart: {
    all: ["cart"] as const,
    current: () => [...queryKeys.cart.all, "current"] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: Record<string, unknown>, context: CatalogContext) =>
      [...queryKeys.products.all, "list", params, context] as const,
    detail: (handle: string, context: CatalogContext) =>
      [...queryKeys.products.all, "detail", handle, context] as const,
  },
} as const;

/**
 * Data that belongs to whoever is signed in. Removed (not just invalidated) on
 * logout, so the previous customer's details never flash on screen.
 */
export const privateQueryRoots = [
  queryKeys.customer.all,
  queryKeys.cart.all,
] as const;
