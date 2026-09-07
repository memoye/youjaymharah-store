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
import { useEffect, useRef, useState } from "react";

import { sdk } from "../../../lib/sdk";

type Branding = {
  id: string;
  name: string;
  logo_url: string | null;
  support_email: string | null;
};

const BRANDING_QUERY_KEY = ["branding"];

const BrandingSettingsPage = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Display query: no `enabled` condition, so the page is populated on load
  // rather than only after the drawer has been opened once.
  const { data, isLoading } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: () => sdk.client.fetch<{ branding: Branding }>("/admin/branding"),
  });

  const branding = data?.branding;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Branding</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The name, logo and support address used across your emails.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          disabled={!branding}
          onClick={() => setDrawerOpen(true)}
        >
          <PencilSquare />
          Edit
        </Button>
      </div>

      {isLoading || !branding ? (
        <div className="flex items-center justify-center px-6 py-8">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : (
        <>
          <Field label="Store name" value={branding.name} />
          <Field
            label="Support email"
            value={branding.support_email ?? "Not set"}
          />
          <div className="grid grid-cols-2 items-center px-6 py-4">
            <Text size="small" leading="compact" weight="plus">
              Logo
            </Text>
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                Not set
              </Text>
            )}
          </div>
        </>
      )}

      {branding && (
        <EditBrandingDrawer
          branding={branding}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
          }}
        />
      )}
    </Container>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-2 items-center px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {value}
    </Text>
  </div>
);

const EditBrandingDrawer = ({
  branding,
  open,
  onOpenChange,
  onSaved,
}: {
  branding: Branding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [name, setName] = useState(branding.name);
  const [supportEmail, setSupportEmail] = useState(
    branding.support_email ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(branding.logo_url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync when the drawer reopens after an external change.
  useEffect(() => {
    if (open) {
      setName(branding.name);
      setSupportEmail(branding.support_email ?? "");
      setLogoUrl(branding.logo_url ?? "");
    }
  }, [open, branding]);

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const { files } = await sdk.admin.upload.create({ files: [file] });
      return files[0]?.url;
    },
    onSuccess: (url) => {
      if (url) {
        setLogoUrl(url);
        toast.success("Logo uploaded. Save to apply it.");
      }
    },
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/branding", {
        method: "POST",
        body: {
          name,
          support_email: supportEmail || null,
          logo_url: logoUrl || null,
        },
      }),
    onSuccess: () => {
      toast.success("Branding updated.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = save.isPending || uploadLogo.isPending;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit branding</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="branding-name">
              Store name
            </Label>
            <Input
              id="branding-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Youjaymharah"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="branding-support-email">
              Support email
            </Label>
            <Input
              id="branding-support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@youjaymharah.com"
            />
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Shown at the bottom of every email you send.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Logo
            </Label>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-12 w-auto object-contain"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadLogo.mutate(file);
                }
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <Button
                size="small"
                variant="secondary"
                disabled={busy}
                isLoading={uploadLogo.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload image
              </Button>
              {logoUrl && (
                <Button
                  size="small"
                  variant="transparent"
                  disabled={busy}
                  onClick={() => setLogoUrl("")}
                >
                  Remove
                </Button>
              )}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              PNG or SVG on a transparent background works best. Around 240px
              wide is plenty for email.
            </Text>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            size="small"
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="small"
            disabled={busy || !name.trim()}
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};

export const config = defineRouteConfig({
  label: "Branding",
});

export default BrandingSettingsPage;
