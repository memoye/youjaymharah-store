import { definePolicies } from "@medusajs/framework/utils";

/**
 * Makes newsletter settings and the subscriber list assignable in the role
 * editor. Granted to Marketing, who need the list and the campaign settings
 * but have no access to orders, payments or customer records.
 */
export const newsletterPolicies = definePolicies([
  {
    name: "ReadNewsletter",
    resource: "newsletter",
    operation: "read",
    description: "View newsletter settings and subscribers",
  },
  {
    name: "UpdateNewsletter",
    resource: "newsletter",
    operation: "update",
    description: "Change newsletter settings",
  },
]);
