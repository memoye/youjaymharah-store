import { defineRouteConfig } from "@medusajs/admin-sdk";
import { PencilSquare, Spinner } from "@medusajs/icons";
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { sdk } from "../../../lib/sdk";

type StorefrontSettings = {
  id: string;
  new_badge_days: number;
};

const SETTINGS_QUERY_KEY = ["storefront-settings"];

const StorefrontSettingsPage = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () =>
      sdk.client.fetch<{ settings: StorefrontSettings }>(
        "/admin/storefront-settings",
      ),
  });

  const settings = data?.settings;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Storefront</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            How products are presented on the website.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          disabled={!settings}
          onClick={() => setDrawerOpen(true)}
        >
          <PencilSquare />
          Edit
        </Button>
      </div>

      {isLoading || !settings ? (
        <div className="flex items-center justify-center px-6 py-8">
          <Spinner className="animate-spin text-ui-fg-subtle" />
        </div>
      ) : (
        <div className="grid grid-cols-2 items-start px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Text size="small" leading="compact" weight="plus">
              New badge
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Counted from launch for coming-soon products, otherwise from when
              the product was created.
            </Text>
          </div>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {settings.new_badge_days}{" "}
            {settings.new_badge_days === 1 ? "day" : "days"}
          </Text>
        </div>
      )}

      {settings && (
        <EditStorefrontSettingsDrawer
          settings={settings}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSaved={(updated) =>
            queryClient.setQueryData<{ settings: StorefrontSettings }>(
              SETTINGS_QUERY_KEY,
              { settings: updated },
            )
          }
        />
      )}
    </Container>
  );
};

const EditStorefrontSettingsDrawer = ({
  settings,
  open,
  onOpenChange,
  onSaved,
}: {
  settings: StorefrontSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (settings: StorefrontSettings) => void;
}) => {
  const [days, setDays] = useState(String(settings.new_badge_days));
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the drawer reopens after an external change.
  useEffect(() => {
    if (open) {
      setDays(String(settings.new_badge_days));
      setError(null);
    }
  }, [open, settings]);

  const save = useMutation({
    mutationFn: (newBadgeDays: number) =>
      sdk.client.fetch<{ settings: StorefrontSettings }>(
        "/admin/storefront-settings",
        { method: "POST", body: { new_badge_days: newBadgeDays } },
      ),
    onSuccess: ({ settings: updated }) => {
      toast.success("Storefront settings updated.");
      onSaved(updated);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSave = () => {
    const value = Number(days);

    if (!Number.isInteger(value) || value < 1 || value > 365) {
      setError("Enter a whole number of days from 1 to 365.");
      return;
    }

    save.mutate(value);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit storefront settings</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label
              size="small"
              weight="plus"
              htmlFor="storefront-new-badge-days"
            >
              Show the New badge for
            </Label>
            <div className="flex items-center gap-x-2">
              <Input
                id="storefront-new-badge-days"
                type="number"
                min={1}
                max={365}
                step={1}
                className="w-28"
                value={days}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setDays(event.target.value);
                  setError(null);
                }}
              />
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                days
              </Text>
            </div>
            {error ? (
              <Text size="small" leading="compact" className="text-ui-fg-error">
                {error}
              </Text>
            ) : (
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                From 1 to 365. Counted from launch for coming-soon products,
                otherwise from when the product was created. The website picks
                up a change as its pages refresh.
              </Text>
            )}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            size="small"
            variant="secondary"
            disabled={save.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="small" isLoading={save.isPending} onClick={onSave}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};

export const config = defineRouteConfig({
  label: "Storefront",
  rank: 3,
});

export default StorefrontSettingsPage;
