import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  Announcement,
  AnnouncementBar,
  AnnouncementDestination,
  AnnouncementOptionsQuery,
} from "../../../modules/storefront-settings/announcements";
import { sdk } from "../../lib/sdk";
import { usePermissions } from "../../lib/permissions";

const SETTINGS_KEY = ["storefront-settings"];
const EMPTY: AnnouncementBar = {
  enabled: false,
  appearance: "dark",
  dismissible: true,
  items: [],
};
type SettingsResponse = { settings: { announcement_bar?: AnnouncementBar } };
type OptionsResponse = {
  options: { id: string; label: string }[];
  count: number;
  offset: number;
  limit: number;
};

function status(item: Announcement, now: number) {
  if (!item.enabled) return "Hidden";
  if (item.ends_at && Date.parse(item.ends_at) <= now) return "Ended";
  if (item.starts_at && Date.parse(item.starts_at) > now) return "Scheduled";
  return item.promotion_id ? "Live if offer is available" : "Live";
}

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function Picker({
  type,
  value,
  onChange,
  disabled,
}: {
  type: AnnouncementOptionsQuery["type"];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [q, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const options = useQuery({
    queryKey: ["announcement-options", type, q, offset],
    queryFn: () =>
      sdk.client.fetch<OptionsResponse>(
        "/admin/storefront-settings/announcement-options",
        { query: { type, q, offset } },
      ),
  });
  const selected = useQuery({
    queryKey: ["announcement-option", type, value],
    queryFn: () =>
      sdk.client.fetch<OptionsResponse>(
        "/admin/storefront-settings/announcement-options",
        { query: { type, id: value } },
      ),
    enabled: Boolean(value),
  });
  const choices = options.data?.options ?? [];
  const selectedLabel =
    selected.data?.options[0]?.label ??
    (selected.isLoading
      ? "Loading selection..."
      : "Unavailable selection - choose another");
  return (
    <div className="flex flex-col gap-y-2">
      <Input
        aria-label={`Search ${type} destinations`}
        placeholder={`Search ${type}...`}
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        value={value || "none"}
        onValueChange={(id) => onChange(id === "none" ? "" : id)}
        disabled={disabled || options.isLoading}
      >
        <Select.Trigger aria-label={`Choose ${type}`}>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="none">None</Select.Item>
          {value && !choices.some((item) => item.id === value) && (
            <Select.Item value={value}>{selectedLabel}</Select.Item>
          )}
          {choices.map((item) => (
            <Select.Item key={item.id} value={item.id}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {options.isError && (
        <Text role="alert">
          Could not load options.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void options.refetch()}
          >
            Retry
          </button>
        </Text>
      )}
      {!options.isLoading && !options.isError && !choices.length && (
        <Text size="small">No matches.</Text>
      )}
      <div className="flex items-center gap-x-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          disabled={disabled || offset === 0 || options.isFetching}
          onClick={() => setOffset(offset - 20)}
        >
          Previous results
        </Button>
        <Button
          type="button"
          size="small"
          variant="secondary"
          disabled={
            disabled ||
            options.isFetching ||
            offset + 20 >= (options.data?.count ?? 0)
          }
          onClick={() => setOffset(offset + 20)}
        >
          Next results
        </Button>
      </div>
    </div>
  );
}

export function AnnouncementsSection() {
  const [open, setOpen] = useState(false);
  const { can } = usePermissions();
  const settings = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      sdk.client.fetch<SettingsResponse>("/admin/storefront-settings"),
  });
  const bar = settings.data?.settings.announcement_bar ?? EMPTY;
  return (
    <Container className="p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading level="h2">Announcements</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Messages above the store header. One message appears on its own;
            multiple live messages get previous and next controls.
          </Text>
        </div>
        {can("storefront_settings", "update") && (
          <Button
            variant="secondary"
            size="small"
            disabled={!settings.data}
            onClick={() => setOpen(true)}
          >
            Edit
          </Button>
        )}
      </div>
      <div className="border-ui-border-base border-t px-6 py-4">
        {settings.isLoading ? (
          <Text>Loading announcements...</Text>
        ) : settings.isError ? (
          <Text role="alert">Announcements could not be loaded.</Text>
        ) : (
          <>
            <Text size="small">
              {bar.enabled ? "Bar enabled" : "Bar hidden"} · {bar.items.length}{" "}
              announcement(s)
            </Text>
            {bar.items.map((item, index) => (
              <Text key={item.id} size="small">
                {index + 1}. {item.message}
              </Text>
            ))}
          </>
        )}
      </div>
      {open && (
        <AnnouncementEditor initial={bar} onClose={() => setOpen(false)} />
      )}
    </Container>
  );
}

function AnnouncementEditor({
  initial,
  onClose,
}: {
  initial: AnnouncementBar;
  onClose: () => void;
}) {
  const [bar, setBar] = useState<AnnouncementBar>(() =>
    structuredClone(initial),
  );
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const queryClient = useQueryClient();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/storefront-settings", {
        method: "POST",
        body: { announcement_bar: bar },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success("Announcements saved.");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });
  const update = (id: string, changes: Partial<Announcement>) =>
    setBar((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  const move = (index: number, delta: number) =>
    setBar((current) => {
      const items = [...current.items];
      [items[index], items[index + delta]] = [
        items[index + delta],
        items[index],
      ];
      return { ...current, items };
    });
  const submit = () => {
    const incomplete = bar.items.some(
      (item) =>
        !item.message.trim() ||
        Boolean(item.destination) !== Boolean(item.link_label?.trim()) ||
        (item.destination && !item.destination.id),
    );
    const invalidDates = bar.items.some(
      (item) =>
        item.starts_at &&
        item.ends_at &&
        Date.parse(item.ends_at) <= Date.parse(item.starts_at),
    );
    if (incomplete || invalidDates) {
      setError(
        invalidDates
          ? "Each end date must be after its start date."
          : "Each announcement needs a message. Links need a destination and label.",
      );
      return;
    }
    setError(null);
    save.mutate();
  };
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <Drawer
      open
      onOpenChange={(opened) => {
        if (!opened && !save.isPending) onClose();
      }}
    >
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit announcements</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <fieldset disabled={save.isPending} className="flex flex-col gap-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="announcement-enabled">
                Show announcement bar
              </Label>
              <Switch
                id="announcement-enabled"
                checked={bar.enabled}
                onCheckedChange={(enabled) => setBar({ ...bar, enabled })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="announcement-dismissible">
                Allow dismissal for this tab session
              </Label>
              <Switch
                id="announcement-dismissible"
                checked={bar.dismissible}
                onCheckedChange={(dismissible) =>
                  setBar({ ...bar, dismissible })
                }
              />
            </div>
            <div>
              <Label htmlFor="announcement-appearance">Appearance</Label>
              <Select
                value={bar.appearance}
                onValueChange={(appearance) =>
                  setBar({
                    ...bar,
                    appearance: appearance as AnnouncementBar["appearance"],
                  })
                }
              >
                <Select.Trigger id="announcement-appearance">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="dark">Dark</Select.Item>
                  <Select.Item value="light">Light</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <Text size="small">
              Dates use {timezone}. Leave dates empty to show an enabled
              announcement continuously. Order below controls display order. Up
              to 20 announcements can be saved.
            </Text>
            {bar.items.map((item, index) => (
              <div
                key={item.id}
                className="border-ui-border-base flex flex-col gap-y-4 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Heading level="h3">Announcement {index + 1}</Heading>
                  <Text size="small">
                    {bar.enabled ? status(item, now) : "Bar hidden"}
                  </Text>
                </div>
                <div className="flex gap-x-2">
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    disabled={index === bar.items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      setBar({
                        ...bar,
                        items: bar.items.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${item.id}-enabled`}>Enabled</Label>
                  <Switch
                    id={`${item.id}-enabled`}
                    checked={item.enabled}
                    onCheckedChange={(enabled) => update(item.id, { enabled })}
                  />
                </div>
                <div>
                  <Label htmlFor={`${item.id}-message`}>Message</Label>
                  <Input
                    id={`${item.id}-message`}
                    maxLength={180}
                    value={item.message}
                    onChange={(event) =>
                      update(item.id, { message: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`${item.id}-type`}>
                    Link destination (optional)
                  </Label>
                  <Select
                    value={item.destination?.type ?? "none"}
                    onValueChange={(type) =>
                      update(item.id, {
                        destination:
                          type === "none"
                            ? null
                            : type === "page"
                              ? { type, id: "new-arrivals" }
                              : {
                                  type: type as
                                    "collection" | "category" | "product",
                                  id: "",
                                },
                        link_label:
                          type === "none"
                            ? null
                            : (item.link_label ?? "Shop now"),
                      })
                    }
                  >
                    <Select.Trigger id={`${item.id}-type`}>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {[
                        "none",
                        "page",
                        "collection",
                        "category",
                        "product",
                      ].map((type) => (
                        <Select.Item key={type} value={type}>
                          {type === "none"
                            ? "No link"
                            : type[0].toUpperCase() + type.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                {item.destination?.type === "page" && (
                  <Select
                    value={item.destination.id}
                    onValueChange={(id) =>
                      update(item.id, {
                        destination: {
                          type: "page",
                          id: id as "home" | "new-arrivals" | "collections",
                        },
                      })
                    }
                  >
                    <Select.Trigger aria-label="Choose store page">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="home">Home</Select.Item>
                      <Select.Item value="new-arrivals">
                        New arrivals
                      </Select.Item>
                      <Select.Item value="collections">
                        All collections
                      </Select.Item>
                    </Select.Content>
                  </Select>
                )}
                {item.destination && item.destination.type !== "page" && (
                  <Picker
                    key={item.destination.type}
                    type={item.destination.type}
                    value={item.destination.id}
                    disabled={save.isPending}
                    onChange={(id) =>
                      update(item.id, {
                        destination: {
                          ...item.destination,
                          id,
                        } as AnnouncementDestination,
                      })
                    }
                  />
                )}
                {item.destination && (
                  <div>
                    <Label htmlFor={`${item.id}-label`}>Link label</Label>
                    <Input
                      id={`${item.id}-label`}
                      maxLength={40}
                      value={item.link_label ?? ""}
                      onChange={(event) =>
                        update(item.id, {
                          link_label: event.target.value || null,
                        })
                      }
                    />
                  </div>
                )}
                {(["starts_at", "ends_at"] as const).map((field) => (
                  <div key={field}>
                    <Label htmlFor={`${item.id}-${field}`}>
                      {field === "starts_at" ? "Starts" : "Ends"} ({timezone})
                    </Label>
                    <Input
                      id={`${item.id}-${field}`}
                      type="datetime-local"
                      value={localDate(item[field])}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
                          !value ||
                          Number.isFinite(new Date(value).getTime())
                        )
                          update(item.id, {
                            [field]: value
                              ? new Date(value).toISOString()
                              : null,
                          });
                      }}
                    />
                  </div>
                ))}
                <div>
                  <Label>Related promotion (optional)</Label>
                  <Text size="small" className="text-ui-fg-subtle">
                    The message is hidden while this offer is inactive, outside
                    its campaign dates, or its global budget is exhausted. A
                    manual code is shown automatically. Only link offers
                    intended for public advertising. Checkout still checks the
                    customer's eligibility.
                  </Text>
                </div>
                <Picker
                  type="promotion"
                  value={item.promotion_id ?? ""}
                  onChange={(id) =>
                    update(item.id, { promotion_id: id || null })
                  }
                  disabled={save.isPending}
                />
                <div
                  aria-label="Announcement preview"
                  className={
                    bar.appearance === "dark"
                      ? "bg-black p-3 text-center text-sm text-white"
                      : "border p-3 text-center text-sm text-black"
                  }
                >
                  {item.message || "Your announcement"}
                  {item.destination && (
                    <span className="ml-2 underline">{item.link_label}</span>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={bar.items.length >= 20}
              onClick={() =>
                setBar({
                  ...bar,
                  items: [
                    ...bar.items,
                    {
                      id: crypto.randomUUID(),
                      enabled: false,
                      message: "",
                      destination: null,
                      link_label: null,
                      starts_at: null,
                      ends_at: null,
                      promotion_id: null,
                    },
                  ],
                })
              }
            >
              Add announcement
            </Button>
            {error && (
              <Text role="alert" className="text-ui-fg-error">
                {error}
              </Text>
            )}
          </fieldset>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            variant="secondary"
            disabled={save.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button isLoading={save.isPending} onClick={submit}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
