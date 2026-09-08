import {
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
  ],
});
