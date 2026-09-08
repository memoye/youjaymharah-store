import { defineRouteConfig } from "@medusajs/admin-sdk";
import { PencilSquare, Spinner } from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { sdk } from "../../../lib/sdk";

type NewsletterSettings = {
  id: string;
  enabled: boolean;
  audience_id: string | null;
  double_opt_in: boolean;
  consent_text: string | null;
  success_message: string | null;
  reply_to: string | null;
  checkout_opt_in: boolean;
  checkout_label: string | null;
};

type Audience = { id: string; name: string };

type Subscriber = { id: string; email: string; status: string };

const SETTINGS_KEY = ["newsletter", "settings"];
const SUBSCRIBERS_KEY = ["newsletter", "subscribers"];

const NewsletterSettingsPage = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ settings: NewsletterSettings }>(
        "/admin/newsletter/settings",
      ),
  });

  // Loaded on mount alongside settings so the counts are visible immediately.
  const { data: subscriberData } = useQuery({
    queryKey: SUBSCRIBERS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ subscribers: Subscriber[]; count: number }>(
        "/admin/newsletter/subscribers?limit=200",
      ),
  });

  const settings = data?.settings;
  const subscribers = subscriberData?.subscribers ?? [];
  const confirmed = subscribers.filter((s) => s.status === "subscribed").length;
  const pending = subscribers.filter((s) => s.status === "pending").length;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Newsletter</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Signup and consent are handled here. Campaigns are composed and sent
            from Resend.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {settings && (
            <Badge size="small" color={settings.enabled ? "green" : "grey"}>
              {settings.enabled ? "Signup open" : "Signup closed"}
            </Badge>
          )}
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
      </div>

      {isLoading || !settings ? (
        <div className="flex items-center justify-center px-6 py-8">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : (
        <>
          <Row
            label="Subscribers"
            value={`${confirmed} confirmed${pending ? `, ${pending} awaiting confirmation` : ""}`}
          />
          <Row
            label="Resend audience"
            value={settings.audience_id ?? "Not selected"}
          />
          <Row
            label="Opt-in"
            value={
              settings.double_opt_in
                ? "Double — confirmation email required"
                : "Single — subscribed on submit"
            }
          />
          <Row
            label="Consent text"
            value={settings.consent_text ?? "Not set"}
          />
          <Row
            label="Checkout opt-in"
            value={settings.checkout_opt_in ? "Shown at checkout" : "Off"}
          />
        </>
      )}

      {settings && (
        <EditNewsletterDrawer
          settings={settings}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
            queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_KEY });
          }}
        />
      )}
    </Container>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-2 items-center px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {value}
    </Text>
  </div>
);

const EditNewsletterDrawer = ({
  settings,
  open,
  onOpenChange,
  onSaved,
}: {
  settings: NewsletterSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState(settings);

  useEffect(() => {
    if (open) {
      setForm(settings);
    }
  }, [open, settings]);

  // Modal-only query: the audience list is fetched from Resend on demand.
  const { data: audienceData, isLoading: audiencesLoading } = useQuery({
    queryKey: ["newsletter", "audiences"],
    queryFn: () =>
      sdk.client.fetch<{ audiences: Audience[] }>(
        "/admin/newsletter/audiences",
      ),
    enabled: open,
  });

  const audiences = audienceData?.audiences ?? [];

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/newsletter/settings", {
        method: "POST",
        body: {
          enabled: form.enabled,
          audience_id: form.audience_id || null,
          double_opt_in: form.double_opt_in,
          consent_text: form.consent_text || null,
          success_message: form.success_message || null,
          reply_to: form.reply_to || null,
          checkout_opt_in: form.checkout_opt_in,
          checkout_label: form.checkout_label || null,
        },
      }),
    onSuccess: () => {
      toast.success("Newsletter settings updated.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Turning signup on without an audience would capture addresses that never
  // reach Resend, so the form refuses that combination outright.
  const blocked = form.enabled && !form.audience_id;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit newsletter settings</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
          <ToggleRow
            label="Accept signups"
            hint="When off, the storefront signup endpoint rejects new addresses."
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              Resend audience
            </Label>
            {audiencesLoading ? (
              <Text size="small" className="text-ui-fg-subtle">
                Loading audiences…
              </Text>
            ) : (
              <Select
                value={form.audience_id ?? ""}
                onValueChange={(v) => setForm({ ...form, audience_id: v })}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select an audience" />
                </Select.Trigger>
                <Select.Content>
                  {audiences.map((a) => (
                    <Select.Item key={a.id} value={a.id}>
                      {a.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            )}
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Confirmed subscribers are added to this audience. Create audiences
              in the Resend dashboard.
            </Text>
          </div>

          <ToggleRow
            label="Double opt-in"
            hint="Send a confirmation email and only subscribe once it is clicked."
            checked={form.double_opt_in}
            onChange={(v) => setForm({ ...form, double_opt_in: v })}
          />

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="consent-text">
              Consent text
            </Label>
            <Textarea
              id="consent-text"
              rows={2}
              value={form.consent_text ?? ""}
              onChange={(e) =>
                setForm({ ...form, consent_text: e.target.value })
              }
            />
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Shown beside the signup field and stored with each subscriber as a
              record of what they agreed to.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="success-message">
              Success message
            </Label>
            <Input
              id="success-message"
              value={form.success_message ?? ""}
              onChange={(e) =>
                setForm({ ...form, success_message: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus" htmlFor="reply-to">
              Reply-to address
            </Label>
            <Input
              id="reply-to"
              type="email"
              value={form.reply_to ?? ""}
              onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
              placeholder="Defaults to your branding support address"
            />
          </div>

          <ToggleRow
            label="Offer signup at checkout"
            hint="Adds an unticked subscribe checkbox to the checkout flow."
            checked={form.checkout_opt_in}
            onChange={(v) => setForm({ ...form, checkout_opt_in: v })}
          />

          {form.checkout_opt_in && (
            <div className="flex flex-col gap-2">
              <Label size="small" weight="plus" htmlFor="checkout-label">
                Checkout checkbox label
              </Label>
              <Input
                id="checkout-label"
                value={form.checkout_label ?? ""}
                onChange={(e) =>
                  setForm({ ...form, checkout_label: e.target.value })
                }
                placeholder="Email me about new arrivals"
              />
            </div>
          )}

          {blocked && (
            <Text size="small" className="text-ui-fg-error">
              Choose an audience before accepting signups, or addresses will be
              captured without ever reaching Resend.
            </Text>
          )}
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
          <Button
            size="small"
            disabled={save.isPending || blocked}
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

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col">
      <Label size="small" weight="plus">
        {label}
      </Label>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {hint}
      </Text>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export const config = defineRouteConfig({
  label: "Newsletter",
  rank: 2,
});

export default NewsletterSettingsPage;
