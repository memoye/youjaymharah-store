/**
 * Looking up what the signed-in staff member may do, from the flat list
 * `GET /admin/rbac/me/permissions` returns ("product:update", ...).
 *
 * Kept free of React so it can be unit tested (`pnpm test:unit`).
 */

export type Can = (resource: string, operation: string) => boolean;

/**
 * A lookup over one permission list. The endpoint expands wildcards already,
 * but `*` is still honoured here in case a policy is granted that way.
 *
 * Unknown permissions are refused: while the list is still loading, callers
 * should hide controls rather than show ones the backend will reject.
 */
export function buildPermissionCheck(
  permissions: readonly string[] | null | undefined,
): Can {
  if (!permissions?.length) {
    return () => false;
  }

  const granted = new Set(permissions);

  return (resource, operation) =>
    granted.has(`${resource}:${operation}`) ||
    granted.has(`${resource}:*`) ||
    granted.has(`*:${operation}`) ||
    granted.has("*:*");
}

export function permissionCheckForQuery(
  permissions: readonly string[] | undefined,
  isError: boolean,
): Can {
  return buildPermissionCheck(isError ? undefined : permissions);
}
