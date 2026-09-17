import { definePolicies } from "@medusajs/framework/utils";

/**
 * Makes cart reminders assignable in the role editor. Store Manager and
 * Marketing can turn them on and change the timing; Support can see the
 * settings and results.
 */
export const cartReminderPolicies = definePolicies([
  {
    name: "ReadCartReminders",
    resource: "cart_reminder",
    operation: "read",
    description: "View bag reminder settings and results",
  },
  {
    name: "UpdateCartReminders",
    resource: "cart_reminder",
    operation: "update",
    description: "Turn bag reminder emails on or off and change their timing",
  },
]);
