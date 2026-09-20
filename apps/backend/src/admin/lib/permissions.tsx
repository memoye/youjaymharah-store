import { useQuery } from "@tanstack/react-query";
import { useMemo, type ComponentType } from "react";

import { permissionCheckForQuery, type Can } from "./permission-check";
import { sdk } from "./sdk";

/**
 * What the signed-in staff member may do, so our admin extensions can hide
 * controls their role can't use. Medusa's own screens mostly don't do this
 * yet, and the dashboard's own permissions context isn't available to
 * extensions, so we read the same endpoint ourselves.
 *
 * This is presentation only: the API policies in src/api/middlewares.ts are
 * what actually refuses the work.
 */

export const PERMISSIONS_QUERY_KEY = ["rbac", "me", "permissions"];

/** Roles rarely change mid-session; one fetch per browser tab is plenty. */
const STALE_TIME = 5 * 60 * 1000;

export type PermissionsResult = {
  can: Can;
  /** True until the answer arrives: keep controls hidden until then. */
  isPending: boolean;
  isError: boolean;
};

export function usePermissions(): PermissionsResult {
  const { data, isPending, isError } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: () =>
      sdk.client.fetch<{ permissions: string[] }>("/admin/rbac/me/permissions"),
    staleTime: STALE_TIME,
    retry: false,
  });

  const can = useMemo(
    () => permissionCheckForQuery(data?.permissions, isError),
    [data, isError],
  );

  return { can, isPending, isError };
}

/**
 * Hides a widget from staff who can't use it. Wrap the export:
 * `export default withPermission(MyWidget, "product", "update")`.
 *
 * The widget renders nothing while permissions load, so a control never
 * appears and then disappears.
 */
export function withPermission<P extends object>(
  Widget: ComponentType<P>,
  resource: string,
  operation: string,
): ComponentType<P> {
  const Guarded = (props: P) => {
    const { can, isPending } = usePermissions();

    if (isPending || !can(resource, operation)) {
      return null;
    }

    return <Widget {...props} />;
  };

  Guarded.displayName = `WithPermission(${Widget.displayName ?? Widget.name ?? "Widget"})`;

  return Guarded;
}
