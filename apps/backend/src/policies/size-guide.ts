import { definePolicies } from "@medusajs/framework/utils";

/**
 * Makes size guides assignable in the role editor. Granted with the catalog
 * (see src/lib/rbac-roles.ts): Store Manager edits them, Support and Marketing
 * can view them.
 */
export const sizeGuidePolicies = definePolicies([
  {
    name: "ReadSizeGuide",
    resource: "size_guide",
    operation: "read",
    description: "View size guides",
  },
  {
    name: "CreateSizeGuide",
    resource: "size_guide",
    operation: "create",
    description: "Create size guides",
  },
  {
    name: "UpdateSizeGuide",
    resource: "size_guide",
    operation: "update",
    description: "Edit size guides",
  },
  {
    name: "DeleteSizeGuide",
    resource: "size_guide",
    operation: "delete",
    description: "Delete size guides",
  },
]);
