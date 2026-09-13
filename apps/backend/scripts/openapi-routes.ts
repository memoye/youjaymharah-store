import { z } from "@medusajs/framework/zod";

import {
  AdminUpdateBranding,
  AdminUpdateNewsletterSettings,
  StoreAddWishlistItem,
  StoreCreateSocialCustomer,
  StoreMergeWishlist,
  StoreNewsletterSubscribe,
  StoreNewsletterToken,
  StoreSetCustomerPassword,
} from "../src/api/middlewares";

/**
 * What the custom API routes accept and return.
 *
 * Request bodies reuse the very Zod schemas the routes validate with, so the
 * spec cannot describe a body the server would reject. Responses are written
 * here as Zod too, mirroring each handler's `res.json(...)`.
 *
 * generate-openapi.ts turns this into docs/api/openapi.json and fails if a
 * route file exists that is not listed here (or vice versa).
 */

export type RouteAuth = "public" | "customer" | "admin";

export type RouteDoc = {
  method: "GET" | "POST" | "DELETE";
  /** Express-style path as Medusa serves it, e.g. /store/x/[id] -> {id}. */
  path: string;
  tag: string;
  summary: string;
  description?: string;
  auth: RouteAuth;
  /** RBAC policies declared in src/api/middlewares.ts. */
  policies?: string[];
  query?: { name: string; description: string; schema: z.ZodType }[];
  body?: z.ZodType;
  response: { description: string; schema: z.ZodType };
  errors?: { status: number; description: string }[];
};

const Branding = z.object({
  id: z.string(),
  name: z.string(),
  logo_url: z.string().nullable(),
  support_email: z.string().nullable(),
});

const NewsletterSettings = z.object({
  id: z.string(),
  enabled: z.boolean(),
  audience_id: z.string().nullable(),
  double_opt_in: z.boolean(),
  consent_text: z.string().nullable(),
  success_message: z.string().nullable(),
  reply_to: z.string().nullable(),
  checkout_opt_in: z.boolean(),
  checkout_label: z.string().nullable(),
});

const NewsletterSubscriber = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(["pending", "subscribed", "unsubscribed"]),
  source: z.string().nullable(),
  consent_text: z.string().nullable(),
  consent_at: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  unsubscribed_at: z.string().nullable(),
  resend_contact_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ResendAudience = z.object({
  id: z.string(),
  name: z.string(),
});

const Wishlist = z.object({
  id: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      product_id: z.string(),
      product_variant_id: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
});

const Acknowledged = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  status: z.string().optional(),
});

const Customer = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  phone: z.string().nullable(),
  has_account: z.boolean(),
  created_at: z.string(),
});

/** Group descriptions, shown as section intros by API viewers. */
/**
 * One hit from the product index. These are the index' own fields, not a
 * product row: prices are absent because they depend on region, currency and
 * any active price list, none of which an index can resolve.
 */
const SearchProduct = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  handle: z.string(),
  thumbnail: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  type: z.string().nullable(),
  collection: z.string().nullable(),
  collection_handle: z.string().nullable(),
  categories: z.array(z.string()),
  category_handles: z.array(z.string()),
  tags: z.array(z.string()),
  sales_channel_ids: z.array(z.string()),
});

/**
 * Every facet requested by the search route is a keyword field, so each one
 * comes back as counted values rather than ranges or stats.
 */
const SearchFacet = z.object({
  type: z.literal("value"),
  values: z.array(z.object({ value: z.string(), count: z.number() })),
  other_count: z.number().optional(),
});

const SearchResult = z.object({
  products: z.array(SearchProduct),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
  facets: z.record(z.string(), SearchFacet),
});

export const TAGS: Record<string, string> = {
  Accounts:
    "Customer accounts beyond Medusa's built-in routes: finishing a social sign-in so one person keeps one customer record.",
  Branding:
    "The store's name, logo and support email, used across customer emails and the storefront.",
  Newsletter:
    "Signup, double opt-in confirmation and unsubscribe, plus the admin side: settings, subscribers and the Resend audiences they sync to.",
  Search:
    "Full-text product search over the Search Module's index, with counted facets for refining a results page.",
  Wishlist:
    "Products a shopper has saved. One entry per product, optionally remembering the colour and size they chose. Signed-in customers use /store/customers/me/wishlist; guests use /store/wishlists, where the wishlist ID works like a guest cart's ID, and the guest list is merged into the customer's at sign-in.",
  Scaffolding:
    "Placeholder routes left by the Medusa starter. They return 200 with no body and can be deleted.",
};

/**
 * The types shared with the storefront, emitted to packages/api-types.
 *
 * `io` decides which side of the schema is described: "input" is what a
 * client sends (optional fields stay optional), "output" is what the server
 * returns. Names are the storefront's public API -- renaming one is a
 * breaking change for whoever imports it.
 */
export const TYPES: {
  name: string;
  schema: z.ZodType;
  io: "input" | "output";
}[] = [
  // Entities
  { name: "Branding", schema: Branding, io: "output" },
  { name: "NewsletterSettings", schema: NewsletterSettings, io: "output" },
  { name: "NewsletterSubscriber", schema: NewsletterSubscriber, io: "output" },
  { name: "ResendAudience", schema: ResendAudience, io: "output" },
  { name: "Wishlist", schema: Wishlist, io: "output" },
  { name: "Customer", schema: Customer, io: "output" },

  // Request bodies
  { name: "AdminUpdateBrandingBody", schema: AdminUpdateBranding, io: "input" },
  {
    name: "AdminUpdateNewsletterSettingsBody",
    schema: AdminUpdateNewsletterSettings,
    io: "input",
  },
  {
    name: "StoreNewsletterSubscribeBody",
    schema: StoreNewsletterSubscribe,
    io: "input",
  },
  {
    name: "StoreNewsletterTokenBody",
    schema: StoreNewsletterToken,
    io: "input",
  },
  {
    name: "StoreCreateSocialCustomerBody",
    schema: StoreCreateSocialCustomer,
    io: "input",
  },
  {
    name: "StoreSetCustomerPasswordBody",
    schema: StoreSetCustomerPassword,
    io: "input",
  },
  {
    name: "StoreAddWishlistItemBody",
    schema: StoreAddWishlistItem,
    io: "input",
  },
  {
    name: "StoreMergeWishlistBody",
    schema: StoreMergeWishlist,
    io: "input",
  },

  // Response payloads
  {
    name: "AdminBrandingResponse",
    schema: z.object({ branding: Branding }),
    io: "output",
  },
  {
    name: "AdminNewsletterSettingsResponse",
    schema: z.object({ settings: NewsletterSettings }),
    io: "output",
  },
  {
    name: "AdminNewsletterSubscribersResponse",
    schema: z.object({
      subscribers: z.array(NewsletterSubscriber),
      count: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
    io: "output",
  },
  {
    name: "AdminNewsletterAudiencesResponse",
    schema: z.object({ audiences: z.array(ResendAudience) }),
    io: "output",
  },
  { name: "StoreNewsletterAckResponse", schema: Acknowledged, io: "output" },
  {
    name: "StoreWishlistResponse",
    schema: z.object({ wishlist: Wishlist }),
    io: "output",
  },
  {
    name: "StoreSocialCustomerResponse",
    schema: z.object({ customer: Customer, linked: z.boolean() }),
    io: "output",
  },
  {
    name: "StoreSetCustomerPasswordResponse",
    schema: z.object({ success: z.boolean() }),
    io: "output",
  },
  { name: "StoreSearchProduct", schema: SearchProduct, io: "output" },
  { name: "StoreSearchResponse", schema: SearchResult, io: "output" },
];

export const ROUTES: RouteDoc[] = [
  {
    method: "GET",
    path: "/admin/branding",
    tag: "Branding",
    summary: "Get store branding",
    description:
      "Store name, logo and support email used in customer emails. Created from environment variables on first read.",
    auth: "admin",
    policies: ["branding:read"],
    response: {
      description: "The store's branding.",
      schema: z.object({ branding: Branding }),
    },
  },
  {
    method: "POST",
    path: "/admin/branding",
    tag: "Branding",
    summary: "Update store branding",
    auth: "admin",
    policies: ["branding:update"],
    body: AdminUpdateBranding,
    response: {
      description: "The updated branding.",
      schema: z.object({ branding: Branding }),
    },
    errors: [{ status: 400, description: "Validation failed." }],
  },
  {
    method: "GET",
    path: "/admin/newsletter/settings",
    tag: "Newsletter",
    summary: "Get newsletter settings",
    auth: "admin",
    policies: ["newsletter:read"],
    response: {
      description: "Signup configuration.",
      schema: z.object({ settings: NewsletterSettings }),
    },
  },
  {
    method: "POST",
    path: "/admin/newsletter/settings",
    tag: "Newsletter",
    summary: "Update newsletter settings",
    auth: "admin",
    policies: ["newsletter:update"],
    body: AdminUpdateNewsletterSettings,
    response: {
      description: "The updated settings.",
      schema: z.object({ settings: NewsletterSettings }),
    },
    errors: [{ status: 400, description: "Validation failed." }],
  },
  {
    method: "GET",
    path: "/admin/newsletter/subscribers",
    tag: "Newsletter",
    summary: "List newsletter subscribers",
    description: "Newest first.",
    auth: "admin",
    policies: ["newsletter:read"],
    query: [
      {
        name: "limit",
        description: "Page size (default 50).",
        schema: z.coerce.number().optional(),
      },
      {
        name: "offset",
        description: "Records to skip (default 0).",
        schema: z.coerce.number().optional(),
      },
      {
        name: "status",
        description: "Filter by subscription status.",
        schema: z.enum(["pending", "subscribed", "unsubscribed"]).optional(),
      },
    ],
    response: {
      description: "A page of subscribers.",
      schema: z.object({
        subscribers: z.array(NewsletterSubscriber),
        count: z.number(),
        limit: z.number(),
        offset: z.number(),
      }),
    },
  },
  {
    method: "GET",
    path: "/admin/newsletter/audiences",
    tag: "Newsletter",
    summary: "List Resend audiences",
    description:
      "Audiences available in the connected Resend account, for choosing where confirmed contacts are synced.",
    auth: "admin",
    policies: ["newsletter:read"],
    response: {
      description: "Audiences from Resend.",
      schema: z.object({ audiences: z.array(ResendAudience) }),
    },
  },
  {
    method: "POST",
    path: "/store/newsletter/subscribe",
    tag: "Newsletter",
    summary: "Sign up for the newsletter",
    description:
      "Public. Always answers the same way whether the address is new, pending or already subscribed, so membership cannot be probed.",
    auth: "public",
    body: StoreNewsletterSubscribe,
    response: {
      description: "Signup accepted.",
      schema: Acknowledged,
    },
    errors: [{ status: 400, description: "Validation failed." }],
  },
  {
    method: "POST",
    path: "/store/newsletter/confirm",
    tag: "Newsletter",
    summary: "Confirm a subscription",
    description: "Takes the single-use token from the confirmation email.",
    auth: "public",
    body: StoreNewsletterToken,
    response: { description: "Subscription confirmed.", schema: Acknowledged },
    errors: [{ status: 400, description: "Missing, unknown or used token." }],
  },
  {
    method: "POST",
    path: "/store/newsletter/unsubscribe",
    tag: "Newsletter",
    summary: "Unsubscribe",
    description:
      "Takes the token from the unsubscribe link in any newsletter email.",
    auth: "public",
    body: StoreNewsletterToken,
    response: { description: "Unsubscribed.", schema: Acknowledged },
    errors: [{ status: 400, description: "Missing, unknown or used token." }],
  },
  {
    method: "POST",
    path: "/store/customers/social",
    tag: "Accounts",
    summary: "Finish a social sign-in",
    description:
      "Call this with the token from GET /auth/customer/{provider}/callback instead of POST /store/customers. If the provider-verified email already has an account, the sign-in method is attached to it and that customer is returned (`linked: true`); otherwise a new customer is created. Only providers that verify email ownership (currently Google) may link; an emailpass identity is rejected.",
    auth: "customer",
    body: StoreCreateSocialCustomer,
    response: {
      description: "The customer this sign-in now belongs to.",
      schema: z.object({ customer: Customer, linked: z.boolean() }),
    },
    errors: [
      { status: 400, description: "The sign-in returned no email address." },
      { status: 401, description: "No auth token was provided." },
      {
        status: 403,
        description:
          "This sign-in method may not be linked to an existing account.",
      },
    ],
  },
  {
    method: "POST",
    path: "/store/customers/me/password",
    tag: "Accounts",
    summary: "Set a password on an account that has none",
    description:
      "For customers who signed up with Google and want to sign in with a password too. The email is taken from the logged-in account, not the request. Refused when the account already has a password — that is a reset, not a set.",
    auth: "customer",
    body: StoreSetCustomerPassword,
    response: {
      description: "The password was set.",
      schema: z.object({ success: z.boolean() }),
    },
    errors: [
      {
        status: 400,
        description: "The password is shorter than 8 characters.",
      },
      { status: 401, description: "No customer is logged in." },
      {
        status: 403,
        description:
          "This account already has a password; use the reset flow instead.",
      },
    ],
  },
  {
    method: "GET",
    path: "/store/customers/me/wishlist",
    tag: "Wishlist",
    summary: "Get the customer's wishlist",
    description:
      "IDs only: load product details through /store/products so region pricing and publish status apply. Returns an empty list before the customer's first save.",
    auth: "customer",
    response: {
      description: "The wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [{ status: 401, description: "No customer is logged in." }],
  },
  {
    method: "POST",
    path: "/store/customers/me/wishlist/items",
    tag: "Wishlist",
    summary: "Save a product to the wishlist",
    description:
      "One entry per product. Saving a product that is already saved does nothing, except that `variant_id` replaces the variant stored before, so the entry follows the customer's latest colour/size choice.",
    auth: "customer",
    body: StoreAddWishlistItem,
    response: {
      description: "The updated wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed, or the variant is not part of the product.",
      },
      { status: 401, description: "No customer is logged in." },
      { status: 404, description: "No such published product." },
    ],
  },
  {
    method: "DELETE",
    path: "/store/customers/me/wishlist/items/{id}",
    tag: "Wishlist",
    summary: "Remove an item from the wishlist",
    auth: "customer",
    response: {
      description: "The updated wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      { status: 401, description: "No customer is logged in." },
      {
        status: 404,
        description:
          "No such item on this customer's wishlist. An item on any other list reads as not found, so item IDs cannot be probed.",
      },
    ],
  },
  {
    method: "POST",
    path: "/store/customers/me/wishlist/merge",
    tag: "Wishlist",
    summary: "Merge a guest wishlist into the customer's",
    description:
      "Call right after sign-in. Products only on the guest list are added; where both lists hold a product the customer's entry stays, taking the guest's colour/size only if it had none. The guest list is then deleted, so its ID stops working.",
    auth: "customer",
    body: StoreMergeWishlist,
    response: {
      description: "The customer's wishlist after the merge.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      { status: 401, description: "No customer is logged in." },
      {
        status: 404,
        description:
          "No such guest wishlist: never created, already merged, cleaned up, or it belongs to a customer.",
      },
    ],
  },
  {
    method: "POST",
    path: "/store/wishlists",
    tag: "Wishlist",
    summary: "Start a guest wishlist",
    description:
      "Creates a guest wishlist holding its first item; there is no way to create an empty one. Keep the returned ID private (an httpOnly cookie): anyone holding it can read and change the list. Guest lists with no saves for 90 days are deleted.",
    auth: "public",
    body: StoreAddWishlistItem,
    response: {
      description: "The new wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed, or the variant is not part of the product.",
      },
      { status: 404, description: "No such published product." },
    ],
  },
  {
    method: "GET",
    path: "/store/wishlists/{id}",
    tag: "Wishlist",
    summary: "Get a guest wishlist",
    description:
      "IDs only, as for the customer's wishlist. A customer's list reads as not found.",
    auth: "public",
    response: {
      description: "The wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      {
        status: 404,
        description:
          "No such guest wishlist: never created, merged at sign-in, cleaned up, or it belongs to a customer.",
      },
    ],
  },
  {
    method: "POST",
    path: "/store/wishlists/{id}/items",
    tag: "Wishlist",
    summary: "Save a product to a guest wishlist",
    description: "Same one-entry-per-product rules as the customer's wishlist.",
    auth: "public",
    body: StoreAddWishlistItem,
    response: {
      description: "The updated wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed, or the variant is not part of the product.",
      },
      {
        status: 404,
        description: "No such guest wishlist, or no such published product.",
      },
    ],
  },
  {
    method: "DELETE",
    path: "/store/wishlists/{id}/items/{item_id}",
    tag: "Wishlist",
    summary: "Remove an item from a guest wishlist",
    auth: "public",
    response: {
      description: "The updated wishlist.",
      schema: z.object({ wishlist: Wishlist }),
    },
    errors: [
      {
        status: 404,
        description:
          "No such guest wishlist, or no such item on it. An item on any other list reads as not found.",
      },
    ],
  },
  {
    method: "GET",
    path: "/store/search",
    tag: "Search",
    summary: "Search products",
    description:
      "Full-text search over published products in the sales channels the publishable key allows, with counted facets for refining the results. Returns the index' own fields rather than product rows: prices depend on region, currency and any active price list, so fetch /store/products with the returned ids to show them. Repeat a filter parameter to pass several values; values within one filter are OR-ed, and separate filters are AND-ed.",
    auth: "public",
    query: [
      {
        name: "q",
        description:
          "The text to match, against title, subtitle, description, type, collection and categories. Omit it to browse the facets alone.",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        description: "Page size, 1 to 50 (default 24).",
        schema: z.coerce.number().optional(),
      },
      {
        name: "offset",
        description: "Records to skip (default 0).",
        schema: z.coerce.number().optional(),
      },
      {
        name: "category",
        description: "Filter by category handle. Repeatable.",
        schema: z.union([z.string(), z.array(z.string())]).optional(),
      },
      {
        name: "type",
        description: "Filter by product type. Repeatable.",
        schema: z.union([z.string(), z.array(z.string())]).optional(),
      },
      {
        name: "collection",
        description: "Filter by collection handle. Repeatable.",
        schema: z.union([z.string(), z.array(z.string())]).optional(),
      },
      {
        name: "tag",
        description: "Filter by tag value. Repeatable.",
        schema: z.union([z.string(), z.array(z.string())]).optional(),
      },
    ],
    response: {
      description: "Matching products, with facet counts.",
      schema: SearchResult,
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed, the publishable key is missing, or the Search Module is not configured on this backend.",
      },
    ],
  },
  {
    method: "GET",
    path: "/admin/custom",
    tag: "Scaffolding",
    summary: "Starter placeholder",
    description:
      "Returns 200 with no body. Left from the Medusa starter; safe to delete.",
    auth: "admin",
    response: { description: "Empty.", schema: z.object({}) },
  },
  {
    method: "GET",
    path: "/store/custom",
    tag: "Scaffolding",
    summary: "Starter placeholder",
    description:
      "Returns 200 with no body. Left from the Medusa starter; safe to delete.",
    auth: "public",
    response: { description: "Empty.", schema: z.object({}) },
  },
];
