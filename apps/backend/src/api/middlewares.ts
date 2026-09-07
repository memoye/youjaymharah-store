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

export default defineMiddlewares({
  routes: [
    // Custom admin routes are ungated unless they declare policies -- without
    // these two entries any authenticated admin user could read and rewrite the
    // store's branding regardless of their role.
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
  ],
});
