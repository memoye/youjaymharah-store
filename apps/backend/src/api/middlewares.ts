import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http";
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
  ],
});
