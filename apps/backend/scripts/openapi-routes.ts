import { z } from "@medusajs/framework/zod";

import {
  AdminCreateSizeGuide,
  AdminSetProductComingSoon,
  AdminSetSizeGuide,
  AdminUpdateBranding,
  AdminUpdateNewsletterSettings,
  AdminUpdateSizeGuide,
  AdminUpdateStorefrontSettings,
  AdminUpdateCartReminderSettings,
  StoreCartReminderToken,
  SizeGuideTable,
  StoreAddWishlistItem,
  StoreCreateProductAlert,
  StoreCreateSocialCustomer,
  StoreMergeWishlist,
  StoreNewsletterSubscribe,
  StoreNewsletterToken,
  StoreSetCustomerPassword,
  StoreSetMarketingPreference,
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
  favicon_url: z.string().nullable(),
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

const ProductAlert = z.object({
  id: z.string(),
  product_id: z.string(),
  variant_id: z.string().nullable(),
  reason: z.enum(["restock", "launch"]),
  status: z.enum(["waiting", "sent", "cancelled", "failed"]),
  created_at: z.string(),
});

const CustomerProductAlert = ProductAlert.extend({
  notified_at: z.string().nullable(),
});

const MarketingPreference = z.object({
  status: z.enum(["none", "pending", "subscribed", "unsubscribed"]),
  available: z.boolean(),
  consent_text: z.string().nullable(),
});

const ProductAlertSummary = z.object({
  waiting: z.number(),
  sent: z.number(),
  by_variant: z.array(
    z.object({ variant_id: z.string().nullable(), count: z.number() }),
  ),
});

const StoreSizeGuide = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  diagram_url: z.string().nullable(),
  unit: z.literal("cm"),
  columns: SizeGuideTable.shape.columns,
  rows: SizeGuideTable.shape.rows,
});

const SizeGuideSource = z.enum(["product", "category", "default"]).nullable();

const NamedRef = z.object({ id: z.string(), name: z.string() });

const AdminSizeGuide = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  diagram_url: z.string().nullable(),
  table: SizeGuideTable,
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  product_count: z.number(),
  categories: z.array(NamedRef),
});

const AdminProductSizeGuide = z.object({
  size_guide_id: z.string().nullable(),
  resolved: z.object({
    size_guide: NamedRef.nullable(),
    source: SizeGuideSource,
    category: NamedRef.nullable(),
  }),
});

const AdminCategorySizeGuide = z.object({
  size_guide_id: z.string().nullable(),
  inherited: z.object({ size_guide: NamedRef, category: NamedRef }).nullable(),
});

const StoredSocialLinks = z.object({
  instagram: z.string().nullable(),
  facebook: z.string().nullable(),
  tiktok: z.string().nullable(),
  x: z.string().nullable(),
  youtube: z.string().nullable(),
  pinterest: z.string().nullable(),
});

const StoredHomepageHero = z.object({
  enabled: z.boolean(),
  eyebrow: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  /** With a video, the poster shown while it loads or when it can't play. */
  desktop_image_url: z.string().nullable(),
  mobile_image_url: z.string().nullable(),
  /** Set means the hero is a video; null means a photo. */
  desktop_video_url: z.string().nullable(),
  /** Only ever set alongside desktop_video_url. */
  mobile_video_url: z.string().nullable(),
  cta_label: z.string().nullable(),
  cta_url: z.string().nullable(),
});

const StorefrontSettings = z.object({
  id: z.string(),
  new_badge_days: z.number(),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  og_image_url: z.string().nullable(),
  twitter_handle: z.string().nullable(),
  social_links: z.record(z.string(), z.string().nullable()),
  allow_indexing: z.boolean(),
  google_site_verification: z.string().nullable(),
  homepage_hero: StoredHomepageHero,
  featured_collection_id: z.string().nullable(),
});

const CartReminderSettings = z.object({
  id: z.string(),
  enabled: z.boolean(),
  first_delay_hours: z.number(),
  second_delay_hours: z.number().nullable(),
  third_delay_hours: z.number().nullable(),
});

const CartReminderStats = z.object({
  stats: z.object({
    /** Start of the 30-day period. */
    since: z.string(),
    carts_reminded: z.number(),
    /** Carts reopened from a reminder's "View your bag" link. */
    carts_opened: z.number(),
    /** Orders placed from a cart after it was reminded. */
    orders_recovered: z.number(),
    revenue_recovered: z.array(
      z.object({ currency_code: z.string(), amount: z.number() }),
    ),
    /** Addresses that used a stop link. */
    stopped: z.number(),
  }),
});

const HomepageHeroHistory = z.object({
  /** Newest first; only the most recent 10 are kept. */
  revisions: z.array(
    z.object({
      id: z.string(),
      hero: StoredHomepageHero,
      /** When a save replaced this hero. */
      replaced_at: z.string(),
      replaced_by: z
        .object({
          id: z.string(),
          email: z.string().nullable(),
          name: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
});

const PublicStorefrontSettings = z.object({
  brand: z.object({
    name: z.string(),
    logo_url: z.string().nullable(),
    favicon_url: z.string().nullable(),
    support_email: z.string().nullable(),
  }),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    og_image_url: z.string().nullable(),
    twitter_handle: z.string().nullable(),
    social_links: StoredSocialLinks,
    allow_indexing: z.boolean(),
    google_site_verification: z.string().nullable(),
  }),
  homepage: z.object({
    /** Render it only when `enabled` is true; text may be saved while off. */
    hero: StoredHomepageHero,
    /** Null when none is set or the collection has since been deleted. */
    featured_collection_id: z.string().nullable(),
  }),
  products: z.object({
    new_badge_days: z.number(),
  }),
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
  "Product alerts":
    '"Notify me" for sold-out sizes and coming-soon products. One email per alert, sent within about 10 minutes of the item becoming buyable, then the alert is done. Asking for an alert is not marketing consent.',
  Marketing:
    "A signed-in customer's marketing email preference, backed by the newsletter list and its double opt-in.",
  "Cart reminders":
    'Emails reminding shoppers about carts they left (their "shopping bag" on the storefront), at up to three delays after the cart\'s last change, with links to restore the cart or stop reminders.',
  Storefront:
    "Settings the storefront renders with, edited from Settings › Storefront: home page content (hero, featured collection), sharing & search defaults (title, description, share image, social profiles, indexing, Search Console verification) and product display (New badge days). The public route also includes the brand.",
  "Size guides":
    "Measurement tables for product pages. A product shows its own guide, else the nearest category's (walking up the category tree), else the store default. Measurements are stored in cm; the storefront converts to inches for display.",
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
  { name: "ProductAlert", schema: CustomerProductAlert, io: "output" },
  { name: "MarketingPreference", schema: MarketingPreference, io: "output" },
  {
    name: "StoreCreateProductAlertBody",
    schema: StoreCreateProductAlert,
    io: "input",
  },
  {
    name: "StoreCreateProductAlertResponse",
    schema: z.object({
      success: z.boolean(),
      alert: ProductAlert.nullable(),
    }),
    io: "output",
  },
  {
    name: "StoreProductAlertsResponse",
    schema: z.object({ alerts: z.array(CustomerProductAlert) }),
    io: "output",
  },
  {
    name: "StoreSetMarketingPreferenceBody",
    schema: StoreSetMarketingPreference,
    io: "input",
  },
  {
    name: "StoreMarketingPreferenceResponse",
    schema: z.object({ marketing: MarketingPreference }),
    io: "output",
  },
  {
    name: "AdminSetProductComingSoonBody",
    schema: AdminSetProductComingSoon,
    io: "input",
  },
  { name: "SizeGuideTable", schema: SizeGuideTable, io: "output" },
  { name: "StoreSizeGuide", schema: StoreSizeGuide, io: "output" },
  {
    name: "StoreSizeGuideResponse",
    schema: z.object({
      size_guide: StoreSizeGuide.nullable(),
      source: SizeGuideSource,
    }),
    io: "output",
  },
  { name: "AdminSizeGuide", schema: AdminSizeGuide, io: "output" },
  {
    name: "AdminCreateSizeGuideBody",
    schema: AdminCreateSizeGuide,
    io: "input",
  },
  {
    name: "AdminUpdateSizeGuideBody",
    schema: AdminUpdateSizeGuide,
    io: "input",
  },
  { name: "AdminSetSizeGuideBody", schema: AdminSetSizeGuide, io: "input" },
  { name: "StorefrontSettings", schema: StorefrontSettings, io: "output" },
  {
    name: "AdminUpdateStorefrontSettingsBody",
    schema: AdminUpdateStorefrontSettings,
    io: "input",
  },
  {
    name: "AdminStorefrontSettingsResponse",
    schema: z.object({ settings: StorefrontSettings }),
    io: "output",
  },
  {
    name: "AdminHomepageHeroHistoryResponse",
    schema: HomepageHeroHistory,
    io: "output",
  },
  {
    name: "StoreStorefrontSettingsResponse",
    schema: z.object({ settings: PublicStorefrontSettings }),
    io: "output",
  },
  { name: "StoreSearchProduct", schema: SearchProduct, io: "output" },
  { name: "StoreSearchResponse", schema: SearchResult, io: "output" },
  {
    name: "AdminCartReminderSettingsResponse",
    schema: z.object({ settings: CartReminderSettings }),
    io: "output",
  },
  {
    name: "AdminUpdateCartReminderSettingsBody",
    schema: AdminUpdateCartReminderSettings,
    io: "input",
  },
  {
    name: "AdminCartReminderStatsResponse",
    schema: CartReminderStats,
    io: "output",
  },
  {
    name: "StoreCartReminderTokenBody",
    schema: StoreCartReminderToken,
    io: "input",
  },
  {
    name: "StoreRestoreCartResponse",
    schema: z.object({ cart_id: z.string() }),
    io: "output",
  },
  {
    name: "StoreStopCartRemindersResponse",
    schema: z.object({ status: z.string() }),
    io: "output",
  },
];

export const ROUTES: RouteDoc[] = [
  {
    method: "GET",
    path: "/admin/storefront-settings",
    tag: "Storefront",
    summary: "Get storefront settings",
    description: "Created with defaults (a 30-day New badge) on first read.",
    auth: "admin",
    policies: ["storefront_settings:read"],
    response: {
      description: "The storefront settings.",
      schema: z.object({ settings: StorefrontSettings }),
    },
  },
  {
    method: "POST",
    path: "/admin/storefront-settings",
    tag: "Storefront",
    summary: "Update storefront settings",
    description: "Only the fields sent change.",
    auth: "admin",
    policies: ["storefront_settings:update"],
    body: AdminUpdateStorefrontSettings,
    response: {
      description: "The updated settings.",
      schema: z.object({ settings: StorefrontSettings }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed: `new_badge_days` must be a whole number from 1 to 365.",
      },
    ],
  },
  {
    method: "GET",
    path: "/admin/storefront-settings/hero-history",
    tag: "Storefront",
    summary: "List previous home page heroes",
    description:
      "Heroes replaced by earlier saves, newest first, with when and by whom. A save records the hero it replaces only when the hero changed and had content; the 10 most recent are kept.",
    auth: "admin",
    policies: ["storefront_settings:read"],
    response: {
      description: "The hero history.",
      schema: HomepageHeroHistory,
    },
  },
  {
    method: "POST",
    path: "/admin/storefront-settings/hero-history/{id}/restore",
    tag: "Storefront",
    summary: "Restore a previous home page hero",
    description:
      "Makes the hero current exactly as it was saved, shown or hidden. The hero it replaces joins the history, so a restore can be undone.",
    auth: "admin",
    policies: ["storefront_settings:update"],
    response: {
      description: "The updated settings.",
      schema: z.object({ settings: StorefrontSettings }),
    },
    errors: [
      {
        status: 404,
        description: "The previous hero is no longer kept.",
      },
      {
        status: 400,
        description: "The hero no longer meets today's validation rules.",
      },
    ],
  },
  {
    method: "GET",
    path: "/store/storefront-settings",
    tag: "Storefront",
    summary: "Get the settings the storefront renders with",
    description:
      "Everything the storefront renders its shell with: `brand` (name, logo, favicon, support email), `seo` (defaults for search results and link previews, social profiles, whether search engines may index the store, Search Console code) and `products` (New badge days). Public and identical for every shopper, so it is safe to read from cached pages.",
    auth: "public",
    response: {
      description: "The public storefront settings.",
      schema: z.object({ settings: PublicStorefrontSettings }),
    },
  },
  {
    method: "GET",
    path: "/admin/size-guides",
    tag: "Size guides",
    summary: "List size guides",
    description:
      "All guides, sorted by name, with the categories that use each as their default and how many products use it as an override.",
    auth: "admin",
    policies: ["size_guide:read"],
    response: {
      description: "The size guides.",
      schema: z.object({ size_guides: z.array(AdminSizeGuide) }),
    },
  },
  {
    method: "POST",
    path: "/admin/size-guides",
    tag: "Size guides",
    summary: "Create a size guide",
    description:
      "Measurement cells are cm numbers or [min, max] ranges; text columns hold strings. Every row's `size` must be a value of the shared Size option. `is_default: true` makes this the store default and clears the previous one.",
    auth: "admin",
    policies: ["size_guide:create"],
    body: AdminCreateSizeGuide,
    response: {
      description: "The new size guide.",
      schema: z.object({ size_guide: AdminSizeGuide }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed: a duplicate column or size, a cell that does not match its column type, a backwards range, or a size that is not a Size option value. The message lists every problem.",
      },
    ],
  },
  {
    method: "GET",
    path: "/admin/size-guides/{id}",
    tag: "Size guides",
    summary: "Get a size guide",
    auth: "admin",
    policies: ["size_guide:read"],
    response: {
      description: "The size guide.",
      schema: z.object({ size_guide: AdminSizeGuide }),
    },
    errors: [{ status: 404, description: "No such size guide." }],
  },
  {
    method: "POST",
    path: "/admin/size-guides/{id}",
    tag: "Size guides",
    summary: "Update a size guide",
    description:
      "Only the fields sent change. A `table` replaces the whole table and is validated like on create.",
    auth: "admin",
    policies: ["size_guide:update"],
    body: AdminUpdateSizeGuide,
    response: {
      description: "The updated size guide.",
      schema: z.object({ size_guide: AdminSizeGuide }),
    },
    errors: [
      { status: 400, description: "Validation failed; see create." },
      { status: 404, description: "No such size guide." },
    ],
  },
  {
    method: "DELETE",
    path: "/admin/size-guides/{id}",
    tag: "Size guides",
    summary: "Delete a size guide",
    description:
      "Also removes it from the products and categories using it; they fall back to their category's guide or the store default.",
    auth: "admin",
    policies: ["size_guide:delete"],
    response: {
      description: "The size guide is deleted.",
      schema: z.object({
        id: z.string(),
        object: z.literal("size_guide"),
        deleted: z.boolean(),
      }),
    },
    errors: [{ status: 404, description: "No such size guide." }],
  },
  {
    method: "GET",
    path: "/admin/products/{id}/size-guide",
    tag: "Size guides",
    summary: "Get a product's size guide",
    description:
      "`size_guide_id` is the product's own override (null when it inherits). `resolved` is the guide the product page actually shows and where it comes from.",
    auth: "admin",
    policies: ["product:read"],
    response: {
      description: "The product's guide.",
      schema: AdminProductSizeGuide,
    },
    errors: [{ status: 404, description: "No such product." }],
  },
  {
    method: "POST",
    path: "/admin/products/{id}/size-guide",
    tag: "Size guides",
    summary: "Set or clear a product's size guide",
    description:
      "`size_guide_id: null` removes the override, so the product uses its category's guide again.",
    auth: "admin",
    policies: ["product:update"],
    body: AdminSetSizeGuide,
    response: {
      description: "The product's guide after the change.",
      schema: AdminProductSizeGuide,
    },
    errors: [{ status: 404, description: "No such product or size guide." }],
  },
  {
    method: "GET",
    path: "/admin/product-categories/{id}/size-guide",
    tag: "Size guides",
    summary: "Get a category's size guide",
    description:
      "`size_guide_id` is the category's own guide. `inherited` is the nearest parent category's guide, which its products use while it has none.",
    auth: "admin",
    policies: ["product_category:read"],
    response: {
      description: "The category's guide.",
      schema: AdminCategorySizeGuide,
    },
    errors: [{ status: 404, description: "No such category." }],
  },
  {
    method: "POST",
    path: "/admin/product-categories/{id}/size-guide",
    tag: "Size guides",
    summary: "Set or clear a category's size guide",
    description:
      "Applies to the category's products and to subcategories without their own guide. `size_guide_id: null` removes it.",
    auth: "admin",
    policies: ["product_category:update"],
    body: AdminSetSizeGuide,
    response: {
      description: "The category's guide after the change.",
      schema: AdminCategorySizeGuide,
    },
    errors: [{ status: 404, description: "No such category or size guide." }],
  },
  {
    method: "GET",
    path: "/store/products/{id}/size-guide",
    tag: "Size guides",
    summary: "Get the size guide for a product page",
    description:
      "The product's own guide, else the nearest category's, else the store default. `size_guide` is null when none applies: hide the size guide link. Measurements are in cm; convert for an inches view. Reads no customer data, so it is safe for cached pages.",
    auth: "public",
    response: {
      description: "The guide, and where it comes from.",
      schema: z.object({
        size_guide: StoreSizeGuide.nullable(),
        source: SizeGuideSource,
      }),
    },
    errors: [{ status: 404, description: "No such published product." }],
  },
  {
    method: "GET",
    path: "/admin/products/{id}/alerts",
    tag: "Product alerts",
    summary: "Count shoppers waiting on a product",
    description:
      "Counts only, per variant; a null `variant_id` counts alerts for any size.",
    auth: "admin",
    policies: ["product:read"],
    response: {
      description: "Waiting and already-notified counts.",
      schema: z.object({ alerts: ProductAlertSummary }),
    },
  },
  {
    method: "POST",
    path: "/admin/products/{id}/coming-soon",
    tag: "Product alerts",
    summary: "Turn coming soon on or off",
    description:
      "Sets `metadata.coming_soon` without touching other metadata. While on, the product stays published, can't be added to a cart or checked out, and shoppers can ask to be notified. Turning it off emails waiting shoppers on the next alert run once the product has stock. Turning it off on a product that was coming soon is its launch: `metadata.launched_at` is set to now (ISO 8601), which the storefront's \"New\" badge counts from.",
    auth: "admin",
    policies: ["product:update"],
    body: AdminSetProductComingSoon,
    response: {
      description:
        "The new setting, and the launch date if the product has ever been launched from coming soon.",
      schema: z.object({
        product: z.object({
          id: z.string(),
          coming_soon: z.boolean(),
          launched_at: z.string().nullable(),
        }),
      }),
    },
    errors: [{ status: 404, description: "No such product." }],
  },
  {
    method: "POST",
    path: "/store/products/{id}/alerts",
    tag: "Product alerts",
    summary: "Ask to be notified when a product can be bought",
    description:
      "For a sold-out variant (or product) or a coming-soon product. Signed in, the account's email is used and any `email` in the body is ignored; as a guest, `email` is required. Nothing is emailed until the item can be bought. Asking again for the same item returns the waiting alert. `marketing_opt_in` also signs the address up for the newsletter, with its confirmation email; a closed newsletter does not fail the request. Guests always get `alert: null`, so the response does not reveal existing alerts.",
    auth: "public",
    body: StoreCreateProductAlert,
    response: {
      description: "The alert was recorded.",
      schema: z.object({
        success: z.boolean(),
        alert: ProductAlert.nullable(),
      }),
    },
    errors: [
      {
        status: 400,
        description:
          "Validation failed, no email for a guest, the variant is not part of the product, the item can be bought now, or the address is waiting on 50 items already.",
      },
      { status: 404, description: "No such published product." },
    ],
  },
  {
    method: "GET",
    path: "/store/customers/me/product-alerts",
    tag: "Product alerts",
    summary: "List the customer's alerts",
    description:
      "Waiting and sent alerts, newest first, up to 100. IDs only: load products through /store/products.",
    auth: "customer",
    response: {
      description: "The alerts.",
      schema: z.object({ alerts: z.array(CustomerProductAlert) }),
    },
    errors: [{ status: 401, description: "No customer is logged in." }],
  },
  {
    method: "DELETE",
    path: "/store/customers/me/product-alerts/{id}",
    tag: "Product alerts",
    summary: "Cancel one of the customer's alerts",
    description: "Cancelling an alert that was already sent does nothing.",
    auth: "customer",
    response: {
      description: "The alert is cancelled.",
      schema: z.object({
        id: z.string(),
        object: z.literal("product_alert"),
        deleted: z.boolean(),
      }),
    },
    errors: [
      { status: 401, description: "No customer is logged in." },
      {
        status: 404,
        description:
          "No such alert for this customer. Another customer's alert reads as not found.",
      },
    ],
  },
  {
    method: "GET",
    path: "/store/customers/me/marketing",
    tag: "Marketing",
    summary: "Get the customer's marketing email preference",
    description:
      "The newsletter status of the account's email address. `pending` means a confirmation email was sent and not yet clicked. `available` is false while signup is switched off in the admin.",
    auth: "customer",
    response: {
      description: "The preference.",
      schema: z.object({ marketing: MarketingPreference }),
    },
    errors: [{ status: 401, description: "No customer is logged in." }],
  },
  {
    method: "POST",
    path: "/store/customers/me/marketing",
    tag: "Marketing",
    summary: "Turn marketing email on or off",
    description:
      "On runs the newsletter signup for the account's email, including the double opt-in confirmation email when that is enabled, so the status becomes `pending` first. Off unsubscribes the address straight away.",
    auth: "customer",
    body: StoreSetMarketingPreference,
    response: {
      description: "The preference after the change.",
      schema: z.object({ marketing: MarketingPreference }),
    },
    errors: [
      { status: 400, description: "Newsletter signup is switched off." },
      { status: 401, description: "No customer is logged in." },
    ],
  },
  {
    method: "GET",
    path: "/admin/branding",
    tag: "Branding",
    summary: "Get store branding",
    description:
      "Store name, logo, favicon and support email. The name, logo and support email appear in customer emails. Created from environment variables on first read.",
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
    path: "/store/cart-reminders/restore",
    tag: "Cart reminders",
    summary: "Restore a cart from a reminder email",
    description:
      "Takes the token from a reminder's \"View your bag\" link (`/shopping-bag/restore?token=`) and returns the cart id, for the storefront to set as the shopper's cart.",
    auth: "public",
    body: StoreCartReminderToken,
    response: {
      description: "The cart.",
      schema: z.object({ cart_id: z.string() }),
    },
    errors: [
      { status: 400, description: "The token is malformed." },
      {
        status: 404,
        description: "Unknown token, or the cart was checked out or deleted.",
      },
    ],
  },
  {
    method: "POST",
    path: "/store/cart-reminders/stop",
    tag: "Cart reminders",
    summary: "Stop cart reminders",
    description:
      "Takes the token from a reminder's stop link (`/shopping-bag/reminders/stop?token=`). No more cart reminders are sent to that address, for any cart. Calling it again changes nothing.",
    auth: "public",
    body: StoreCartReminderToken,
    response: {
      description: "Stopped.",
      schema: z.object({ status: z.string() }),
    },
    errors: [
      { status: 400, description: "The token is malformed." },
      { status: 404, description: "Unknown token." },
    ],
  },
  {
    method: "GET",
    path: "/admin/cart-reminders/settings",
    tag: "Cart reminders",
    summary: "Get cart reminder settings",
    description:
      "Created on first read, with reminders off and delays of 1, 24 and 168 hours.",
    auth: "admin",
    policies: ["cart_reminder:read"],
    response: {
      description: "The settings.",
      schema: z.object({ settings: CartReminderSettings }),
    },
  },
  {
    method: "POST",
    path: "/admin/cart-reminders/settings",
    tag: "Cart reminders",
    summary: "Update cart reminder settings",
    description:
      "Only the fields sent change. Delays are hours after the cart's last change; null turns the second or third reminder off. The delays must stay in order.",
    auth: "admin",
    policies: ["cart_reminder:update"],
    body: AdminUpdateCartReminderSettings,
    response: {
      description: "The updated settings.",
      schema: z.object({ settings: CartReminderSettings }),
    },
    errors: [
      {
        status: 400,
        description:
          "A delay is out of range, or the delays would be out of order.",
      },
    ],
  },
  {
    method: "GET",
    path: "/admin/cart-reminders/stats",
    tag: "Cart reminders",
    summary: "Cart reminder results",
    description:
      "The last 30 days: carts reminded, carts reopened from an email, orders placed from reminded carts and their value, and addresses that stopped reminders.",
    auth: "admin",
    policies: ["cart_reminder:read"],
    response: { description: "The results.", schema: CartReminderStats },
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
