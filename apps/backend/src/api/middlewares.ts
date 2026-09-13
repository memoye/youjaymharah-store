import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import type { BaseEntity } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

export const AdminUpdateBranding = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.url().nullable().optional(),
  support_email: z.email().nullable().optional(),
});

export type AdminUpdateBrandingType = z.infer<typeof AdminUpdateBranding>;

export const AdminUpdateNewsletterSettings = z.object({
  enabled: z.boolean().optional(),
  audience_id: z.string().nullable().optional(),
  double_opt_in: z.boolean().optional(),
  consent_text: z.string().nullable().optional(),
  success_message: z.string().nullable().optional(),
  reply_to: z.email().nullable().optional(),
  checkout_opt_in: z.boolean().optional(),
  checkout_label: z.string().nullable().optional(),
});

export type AdminUpdateNewsletterSettingsType = z.infer<
  typeof AdminUpdateNewsletterSettings
>;

export const StoreNewsletterSubscribe = z.object({
  email: z.email(),
  source: z.string().max(64).optional(),
});

export type StoreNewsletterSubscribeType = z.infer<
  typeof StoreNewsletterSubscribe
>;

export const StoreNewsletterToken = z.object({
  token: z.string().min(16),
});

export type StoreNewsletterTokenType = z.infer<typeof StoreNewsletterToken>;

export const StoreSetCustomerPassword = z.object({
  password: z.string().min(8),
});

export type StoreSetCustomerPasswordType = z.infer<
  typeof StoreSetCustomerPassword
>;

export const StoreCreateSocialCustomer = z.object({
  first_name: z.string().min(1).nullable().optional(),
  last_name: z.string().min(1).nullable().optional(),
});

export type StoreCreateSocialCustomerType = z.infer<
  typeof StoreCreateSocialCustomer
>;

export const StoreAddWishlistItem = z.object({
  product_id: z.string().min(1),
  /** Set when a specific colour/size was chosen on the product page. */
  variant_id: z.string().min(1).nullable().optional(),
});

export type StoreAddWishlistItemType = z.infer<typeof StoreAddWishlistItem>;

export const StoreMergeWishlist = z.object({
  /** The guest wishlist to fold into the signed-in customer's list. */
  wishlist_id: z.string().min(1),
});

export type StoreMergeWishlistType = z.infer<typeof StoreMergeWishlist>;

export const StoreCreateProductAlert = z.object({
  /** Required for guests; ignored when signed in (the account email is used). */
  email: z.email().optional(),
  /** Set when a specific size/colour was chosen; omit to wait on any. */
  variant_id: z.string().min(1).nullable().optional(),
  /** Also sign the address up for the newsletter (double opt-in applies). */
  marketing_opt_in: z.boolean().optional(),
});

export type StoreCreateProductAlertType = z.infer<
  typeof StoreCreateProductAlert
>;

export const StoreSetMarketingPreference = z.object({
  subscribed: z.boolean(),
});

export type StoreSetMarketingPreferenceType = z.infer<
  typeof StoreSetMarketingPreference
>;

export const AdminSetProductComingSoon = z.object({
  coming_soon: z.boolean(),
});

export type AdminSetProductComingSoonType = z.infer<
  typeof AdminSetProductComingSoon
>;

/**
 * A size guide's table. Structure only: whether cells match their column's
 * type and whether sizes exist is checked in the workflow, where the messages
 * can name the column and size.
 */
export const SizeGuideTable = z.object({
  columns: z
    .array(
      z.object({
        key: z
          .string()
          .regex(/^[a-z][a-z0-9_]*$/, "Column keys use a-z, 0-9 and _.")
          .max(32),
        label: z.string().trim().min(1).max(40),
        type: z.enum(["measurement", "text"]),
      }),
    )
    .min(1)
    .max(12),
  rows: z
    .array(
      z.object({
        size: z.string().trim().min(1).max(20),
        values: z.record(
          z.string(),
          z.union([
            // Centimetres. 500 is far past any body or garment measurement.
            z.number().positive().max(500),
            z.tuple([
              z.number().positive().max(500),
              z.number().positive().max(500),
            ]),
            z.string().trim().max(40),
            z.null(),
          ]),
        ),
      }),
    )
    .min(1)
    .max(40),
});

export const AdminCreateSizeGuide = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  diagram_url: z.url().nullable().optional(),
  table: SizeGuideTable,
  is_default: z.boolean().optional(),
});

export type AdminCreateSizeGuideType = z.infer<typeof AdminCreateSizeGuide>;

export const AdminUpdateSizeGuide = AdminCreateSizeGuide.partial();

export type AdminUpdateSizeGuideType = z.infer<typeof AdminUpdateSizeGuide>;

export const AdminSetSizeGuide = z.object({
  /** null removes the guide, so the product or category inherits again. */
  size_guide_id: z.string().min(1).nullable(),
});

export type AdminSetSizeGuideType = z.infer<typeof AdminSetSizeGuide>;

export const AdminUpdateStorefrontSettings = z.object({
  /** Whole days, from 1 to a year. */
  new_badge_days: z.number().int().min(1).max(365).optional(),
});

export type AdminUpdateStorefrontSettingsType = z.infer<
  typeof AdminUpdateStorefrontSettings
>;

/**
 * A repeatable query parameter: Express hands over a string for one
 * occurrence and an array for several, so both are normalized to an array.
 */
const repeatable = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .optional();

export const StoreSearchProducts = z.object({
  q: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).default(0),
  category: repeatable,
  type: repeatable,
  collection: repeatable,
  tag: repeatable,
});

export type StoreSearchProductsType = z.infer<typeof StoreSearchProducts>;

export default defineMiddlewares({
  routes: [
    // Custom admin routes are ungated unless they declare policies -- without
    // these entries any authenticated admin user could read and rewrite these
    // settings regardless of their role.
    {
      matcher: "/admin/branding",
      method: ["GET"],
      policies: [{ resource: "branding", operation: "read" }],
    },
    {
      matcher: "/admin/branding",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminUpdateBranding)],
      policies: [{ resource: "branding", operation: "update" }],
    },
    {
      matcher: "/admin/newsletter/*",
      method: ["GET"],
      policies: [{ resource: "newsletter", operation: "read" }],
    },
    {
      matcher: "/admin/newsletter/settings",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminUpdateNewsletterSettings)],
      policies: [{ resource: "newsletter", operation: "update" }],
    },
    // Store routes are public; validation is the only gate, and the handlers
    // deliberately return the same response whether or not an address is known.
    {
      matcher: "/store/newsletter/subscribe",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreNewsletterSubscribe)],
    },
    {
      matcher: "/store/newsletter/confirm",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreNewsletterToken)],
    },
    {
      matcher: "/store/newsletter/unsubscribe",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreNewsletterToken)],
    },
    // Finishing a social sign-in: the caller holds a token for an auth
    // identity that may not have a customer yet, so `allowUnregistered`
    // mirrors how Medusa gates its own POST /store/customers.
    {
      matcher: "/store/customers/social",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnregistered: true,
        }),
        validateAndTransformBody(StoreCreateSocialCustomer),
      ],
    },
    // Also under /store/customers/me, so a logged-in customer is guaranteed;
    // the email comes from their account, never from the body.
    {
      matcher: "/store/customers/me/password",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreSetCustomerPassword)],
    },
    // Wishlist routes live under /store/customers/me, which Medusa already
    // restricts to logged-in customers; only the body needs validating.
    {
      matcher: "/store/customers/me/wishlist/items",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreAddWishlistItem)],
    },
    {
      matcher: "/store/customers/me/wishlist/merge",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreMergeWishlist)],
    },
    // Guest wishlists are public, like guest carts: the wishlist ID is the
    // credential, and the workflows refuse any list that belongs to a customer.
    {
      matcher: "/store/wishlists",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreAddWishlistItem)],
    },
    {
      matcher: "/store/wishlists/:id/items",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreAddWishlistItem)],
    },
    // Guests and customers share one route: a valid customer token means the
    // account email is used, and no token means the body must carry one.
    {
      matcher: "/store/products/:id/alerts",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        validateAndTransformBody(StoreCreateProductAlert),
      ],
    },
    {
      matcher: "/store/customers/me/marketing",
      method: ["POST"],
      middlewares: [validateAndTransformBody(StoreSetMarketingPreference)],
    },
    // Built-in product permissions, so whoever may edit a product may also
    // launch it, and whoever may view it sees who is waiting.
    {
      matcher: "/admin/products/:id/alerts",
      method: ["GET"],
      policies: [{ resource: "product", operation: "read" }],
    },
    {
      matcher: "/admin/products/:id/coming-soon",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminSetProductComingSoon)],
      policies: [{ resource: "product", operation: "update" }],
    },
    // Size guides have their own permission (src/policies/size-guide.ts);
    // assigning one to a product or category needs edit rights on that
    // product or category instead.
    {
      matcher: "/admin/size-guides",
      method: ["GET"],
      policies: [{ resource: "size_guide", operation: "read" }],
    },
    {
      matcher: "/admin/size-guides",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminCreateSizeGuide)],
      policies: [{ resource: "size_guide", operation: "create" }],
    },
    {
      matcher: "/admin/size-guides/:id",
      method: ["GET"],
      policies: [{ resource: "size_guide", operation: "read" }],
    },
    {
      matcher: "/admin/size-guides/:id",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminUpdateSizeGuide)],
      policies: [{ resource: "size_guide", operation: "update" }],
    },
    {
      matcher: "/admin/size-guides/:id",
      method: ["DELETE"],
      policies: [{ resource: "size_guide", operation: "delete" }],
    },
    {
      matcher: "/admin/products/:id/size-guide",
      method: ["GET"],
      policies: [{ resource: "product", operation: "read" }],
    },
    {
      matcher: "/admin/products/:id/size-guide",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminSetSizeGuide)],
      policies: [{ resource: "product", operation: "update" }],
    },
    {
      matcher: "/admin/product-categories/:id/size-guide",
      method: ["GET"],
      policies: [{ resource: "product_category", operation: "read" }],
    },
    {
      matcher: "/admin/product-categories/:id/size-guide",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminSetSizeGuide)],
      policies: [{ resource: "product_category", operation: "update" }],
    },
    {
      matcher: "/admin/storefront-settings",
      method: ["GET"],
      policies: [{ resource: "storefront_settings", operation: "read" }],
    },
    {
      matcher: "/admin/storefront-settings",
      method: ["POST"],
      middlewares: [validateAndTransformBody(AdminUpdateStorefrontSettings)],
      policies: [{ resource: "storefront_settings", operation: "update" }],
    },
    // Search reads its arguments from the query string, so the schema gates
    // the paging limits as well -- an unbounded `limit` would let one request
    // pull the whole index.
    {
      matcher: "/store/search",
      method: ["GET"],
      middlewares: [
        // The type argument is not optional in practice: the helper's `TEntity`
        // is not referenced by either parameter, so nothing infers it, and the
        // call's return type degrades to one that no longer satisfies
        // `MiddlewareRoute["middlewares"]`. TypeScript then re-infers the whole
        // `routes` array against a different shape and reports the *other*
        // entries' `policies` as unknown properties -- errors nowhere near the
        // real cause. There is no entity behind this route, so the base type is
        // the honest argument.
        validateAndTransformQuery<BaseEntity>(StoreSearchProducts, {
          isList: true,
          defaultLimit: 24,
        }),
      ],
    },
  ],
});
