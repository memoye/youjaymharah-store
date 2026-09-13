import { definePolicies } from "@medusajs/framework/utils";

/**
 * Makes storefront settings assignable in the role editor. Store Manager and
 * Marketing can change them; Support can view them. Unlike branding, these are
 * merchandising decisions rather than store identity.
 */
export const storefrontSettingsPolicies = definePolicies([
  {
    name: "ReadStorefrontSettings",
    resource: "storefront_settings",
    operation: "read",
    description: "View storefront settings",
  },
  {
    name: "UpdateStorefrontSettings",
    resource: "storefront_settings",
    operation: "update",
    description:
      "Change storefront settings, such as how long products count as new",
  },
]);
