import { definePolicies } from "@medusajs/framework/utils";

/**
 * Makes `branding:read` and `branding:update` assignable in the admin's role
 * editor. Without this the custom module is invisible to RBAC and its routes
 * cannot be gated.
 *
 * Deliberately owner-only in practice: Store Manager gets the whole catalog
 * and operations surface but not the store's identity.
 */
export const brandingPolicies = definePolicies([
  {
    name: "ReadBranding",
    resource: "branding",
    operation: "read",
    description: "View store branding settings",
  },
  {
    name: "UpdateBranding",
    resource: "branding",
    operation: "update",
    description: "Change store name, logo and support email",
  },
]);
