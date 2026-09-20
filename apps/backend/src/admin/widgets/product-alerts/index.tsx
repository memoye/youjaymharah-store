import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminProduct,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import { Container, Heading, Label, Switch, Text, toast } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { sdk } from "../../lib/sdk";
import { usePermissions, withPermission } from "../../lib/permissions";

type AlertSummary = {
  waiting: number;
  sent: number;
  by_variant: { variant_id: string | null; count: number }[];
};

const alertsQueryKey = (productId: string) => ["product-alerts", productId];

/**
 * "Coming soon" switch and the number of shoppers waiting to hear when this
 * product can be bought. Coming soon keeps the product visible on the
 * storefront with a "Notify me" button, and blocks buying it.
 */
const ProductAlertsWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can("product", "update");
  const [comingSoon, setComingSoon] = useState(
    product.metadata?.coming_soon === true,
  );

  // Re-sync when the host page refetches the product.
  useEffect(() => {
    setComingSoon(product.metadata?.coming_soon === true);
  }, [product.metadata?.coming_soon]);

  const { data, isLoading } = useQuery({
    queryKey: alertsQueryKey(product.id),
    queryFn: () =>
      sdk.client.fetch<{ alerts: AlertSummary }>(
        `/admin/products/${product.id}/alerts`,
      ),
  });

  const toggle = useMutation({
    mutationFn: (value: boolean) =>
      sdk.client.fetch(`/admin/products/${product.id}/coming-soon`, {
        method: "POST",
        body: { coming_soon: value },
      }),
    onMutate: (value) => setComingSoon(value),
    onSuccess: (_result, value) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        value
          ? "Marked as coming soon. Shoppers can ask to be notified."
          : "Launched. Everyone waiting is emailed once it has stock.",
      );
    },
    onError: (error: Error, value) => {
      setComingSoon(!value);
      toast.error(error.message);
    },
  });

  const variantTitle = (variantId: string | null) =>
    variantId
      ? (product.variants?.find((variant) => variant.id === variantId)?.title ??
        "A deleted variant")
      : "Any size";

  const alerts = data?.alerts;

  function renderAlerts() {
    if (!alerts?.waiting) {
      return (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Nobody is waiting on this product.
          {alerts?.sent ? ` ${alerts.sent} already notified.` : ""}
        </Text>
      );
    }
    return (
      <>
        <Text size="small" leading="compact" weight="plus">
          {alerts.waiting} waiting
          {alerts.sent ? ` · ${alerts.sent} already notified` : ""}
        </Text>
        {alerts.by_variant.map(({ variant_id, count }) => (
          <div
            key={variant_id ?? "any"}
            className="flex items-center justify-between"
          >
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {variantTitle(variant_id)}
            </Text>
            <Text size="small" leading="compact">
              {count}
            </Text>
          </div>
        ))}
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          They're emailed automatically within 10 minutes of the item being in
          stock
          {comingSoon ? " and coming soon being turned off" : ""}.
        </Text>
      </>
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Notify me</Heading>
      </div>

      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="product-coming-soon" size="small" weight="plus">
            Coming soon
          </Label>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Shows the product with a "Notify me" button instead of "Add to bag",
            and blocks checkout.
          </Text>
        </div>
        <Switch
          id="product-coming-soon"
          checked={comingSoon}
          disabled={!canEdit || toggle.isPending}
          onCheckedChange={(value) => toggle.mutate(value)}
        />
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        {isLoading ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          renderAlerts()
        )}
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side",
});

export default withPermission(ProductAlertsWidget, "product", "read");
