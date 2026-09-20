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
  Switch,
  Text,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { usePermissions } from "../../../lib/permissions";
import { sdk } from "../../../lib/sdk";

type CartReminderSettings = {
  id: string;
  enabled: boolean;
  first_delay_hours: number;
  second_delay_hours: number | null;
  third_delay_hours: number | null;
};

type CartReminderStats = {
  since: string;
  carts_reminded: number;
  carts_opened: number;
  orders_recovered: number;
  revenue_recovered: { currency_code: string; amount: number }[];
  stopped: number;
};

const SETTINGS_KEY = ["cart-reminders", "settings"];
const STATS_KEY = ["cart-reminders", "stats"];

/** "1 hour", "1 day", "1 week", "36 hours". */
function describeHours(hours: number): string {
  if (hours % 168 === 0) {
    const weeks = hours / 168;
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }

  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function describeDelay(hours: number | null): string {
  return hours === null
    ? "Off"
    : `${describeHours(hours)} after the bag's last change`;
}

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode.toUpperCase()}`;
  }
}

/** Staff without edit rights get a 403; say why instead of a raw error. */
function saveError(error: Error & { status?: number }) {
  toast.error(
    error.status === 403
      ? "Only Marketing, the Store Manager and the store owner can change bag reminders."
      : error.message,
  );
}

const CartRemindersPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ settings: CartReminderSettings }>(
        "/admin/cart-reminders/settings",
      ),
  });

  const statsQuery = useQuery({
    queryKey: STATS_KEY,
    queryFn: () =>
      sdk.client.fetch<{ stats: CartReminderStats }>(
        "/admin/cart-reminders/stats",
      ),
  });

  const { can } = usePermissions();
  const canEdit = can("cart_reminder", "update");
  const settings = settingsQuery.data?.settings;
  const stats = statsQuery.data?.stats;

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-start justify-between gap-x-4 px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-2">
              <Heading level="h2">Bag reminders</Heading>
              {settings && (
                <Badge
                  size="2xsmall"
                  color={settings.enabled ? "green" : "grey"}
                >
                  {settings.enabled ? "On" : "Off"}
                </Badge>
              )}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              Emails shoppers who leave items in their shopping bag, with a
              button that reopens the bag. Sent to signed-in customers and to
              guests who entered their email at checkout.
            </Text>
          </div>
          {canEdit && (
            <Button
              size="small"
              variant="secondary"
              disabled={!settings}
              onClick={() => setOpen(true)}
            >
              <PencilSquare />
              Edit
            </Button>
          )}
        </div>
        {settingsQuery.isLoading ? (
          <div className="flex justify-center px-6 py-8">
            <Spinner className="text-ui-fg-subtle animate-spin" />
          </div>
        ) : settingsQuery.error ? (
          <Row
            label="Settings"
            value="You don't have access to bag reminders."
          />
        ) : settings ? (
          <>
            <Row
              label="First reminder"
              value={describeDelay(settings.first_delay_hours)}
            />
            <Row
              label="Second reminder"
              value={describeDelay(settings.second_delay_hours)}
            />
            <Row
              label="Last reminder"
              value={describeDelay(settings.third_delay_hours)}
            />
            <div className="flex flex-col gap-y-2 px-6 py-4">
              <Text size="small" leading="compact" weight="plus">
                Who isn't reminded
              </Text>
              <ul className="text-ui-fg-subtle list-disc pl-5">
                {[
                  'Anyone who used the "Stop bag reminders" link in a reminder.',
                  "Anyone who unsubscribed from the newsletter.",
                  "Anyone who placed an order after last changing the bag.",
                  "Bags without items or without an email address.",
                ].map((line) => (
                  <li key={line}>
                    <Text size="small" leading="compact">
                      {line}
                    </Text>
                  </li>
                ))}
              </ul>
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                A shopper who comes back and changes their bag moves the next
                reminder later. Reminders more than two days overdue are
                skipped, so turning reminders on doesn't email old bags.
              </Text>
            </div>
            <EditDrawer
              settings={settings}
              open={open}
              onOpenChange={setOpen}
              onSaved={(updated) =>
                queryClient.setQueryData<{ settings: CartReminderSettings }>(
                  SETTINGS_KEY,
                  { settings: updated },
                )
              }
            />
          </>
        ) : null}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-y-1 px-6 py-4">
          <Heading level="h2">Last 30 days</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Orders count when a bag is checked out after at least one reminder.
          </Text>
        </div>
        {statsQuery.isLoading ? (
          <div className="flex justify-center px-6 py-8">
            <Spinner className="text-ui-fg-subtle animate-spin" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-4">
            <Stat label="Bags reminded" value={String(stats.carts_reminded)} />
            <Stat
              label="Bags reopened from an email"
              value={String(stats.carts_opened)}
            />
            <Stat
              label="Orders from reminded bags"
              value={String(stats.orders_recovered)}
              detail={
                stats.revenue_recovered.length
                  ? stats.revenue_recovered
                      .map(({ amount, currency_code }) =>
                        formatAmount(amount, currency_code),
                      )
                      .join(" · ")
                  : undefined
              }
            />
            <Stat label="Stopped reminders" value={String(stats.stopped)} />
          </div>
        ) : (
          <Row label="Results" value="Results couldn't be loaded." />
        )}
      </Container>
    </div>
  );
};

type Draft = { first: string; second: string; third: string };

function problemsFor(draft: Draft): Partial<Record<keyof Draft, string>> {
  const problems: Partial<Record<keyof Draft, string>> = {};
  const first = Number(draft.first);
  const second = draft.second.trim() ? Number(draft.second) : null;
  const third = draft.third.trim() ? Number(draft.third) : null;

  if (!Number.isInteger(first) || first < 1 || first > 168) {
    problems.first = "Enter whole hours from 1 to 168 (1 week).";
  }

  if (second !== null) {
    if (!Number.isInteger(second) || second < 2 || second > 720) {
      problems.second =
        "Enter whole hours up to 720 (30 days), or leave empty.";
    } else if (!problems.first && second <= first) {
      problems.second = "Has to come after the first reminder.";
    }
  }

  if (third !== null) {
    if (second === null) {
      problems.third = "Set a second reminder first.";
    } else if (!Number.isInteger(third) || third < 3 || third > 2160) {
      problems.third =
        "Enter whole hours up to 2160 (90 days), or leave empty.";
    } else if (!problems.second && third <= second) {
      problems.third = "Has to come after the second reminder.";
    }
  }

  return problems;
}

const EditDrawer = ({
  settings,
  open,
  onOpenChange,
  onSaved,
}: {
  settings: CartReminderSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (settings: CartReminderSettings) => void;
}) => {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [draft, setDraft] = useState<Draft>({
    first: "",
    second: "",
    third: "",
  });
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    if (open) {
      setEnabled(settings.enabled);
      setDraft({
        first: String(settings.first_delay_hours),
        second: settings.second_delay_hours?.toString() ?? "",
        third: settings.third_delay_hours?.toString() ?? "",
      });
      setShowProblems(false);
    }
  }, [open, settings]);

  const problems = showProblems ? problemsFor(draft) : {};

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ settings: CartReminderSettings }>(
        "/admin/cart-reminders/settings",
        {
          method: "POST",
          body: {
            enabled,
            first_delay_hours: Number(draft.first),
            second_delay_hours: draft.second.trim()
              ? Number(draft.second)
              : null,
            third_delay_hours:
              draft.second.trim() && draft.third.trim()
                ? Number(draft.third)
                : null,
          },
        },
      ),
    onSuccess: ({ settings: updated }) => {
      toast.success(
        updated.enabled ? "Bag reminders are on." : "Bag reminders saved.",
      );
      onSaved(updated);
      onOpenChange(false);
    },
    onError: saveError,
  });

  const onSave = () => {
    if (Object.keys(problemsFor(draft)).length) {
      setShowProblems(true);
      return;
    }

    save.mutate();
  };

  const field = (
    key: keyof Draft,
    label: string,
    hint: string,
    placeholder: string,
  ) => {
    const hours = Number(draft[key]);
    const preview =
      draft[key].trim() && Number.isInteger(hours) && hours > 0
        ? `${describeHours(hours)}. `
        : "";

    return (
      <div className="flex flex-col gap-y-2">
        <Label htmlFor={`cart-reminder-${key}`} size="small" weight="plus">
          {label}
        </Label>
        <div className="flex items-center gap-x-2">
          <Input
            id={`cart-reminder-${key}`}
            type="number"
            min={1}
            step={1}
            className="w-28"
            value={draft[key]}
            placeholder={placeholder}
            aria-invalid={Boolean(problems[key])}
            onChange={(event) =>
              setDraft((current) => ({ ...current, [key]: event.target.value }))
            }
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            hours
          </Text>
        </div>
        <Text
          size="small"
          leading="compact"
          className={problems[key] ? "text-ui-fg-error" : "text-ui-fg-subtle"}
        >
          {problems[key] ?? `${preview}${hint}`}
        </Text>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit bag reminders</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
          <div className="border-ui-border-base flex items-start justify-between gap-x-4 rounded-lg border px-4 py-3">
            <div className="flex flex-col gap-y-1">
              <Label
                htmlFor="cart-reminders-enabled"
                size="small"
                weight="plus"
              >
                Send bag reminders
              </Label>
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                Reminders start within 10 minutes of turning this on, for bags
                changed recently. Every email has a link to stop reminders.
              </Text>
            </div>
            <Switch
              id="cart-reminders-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
          {field(
            "first",
            "First reminder",
            "After the bag's last change.",
            "1",
          )}
          {field(
            "second",
            "Second reminder (optional)",
            "Leave empty to send only one reminder.",
            "24",
          )}
          {field(
            "third",
            "Last reminder (optional)",
            "Leave empty to stop after the second. 168 hours is 1 week.",
            "168",
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
          <Button size="small" isLoading={save.isPending} onClick={onSave}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-2 items-start gap-x-4 px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {value}
    </Text>
  </div>
);

const Stat = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) => (
  <div className="border-ui-border-base flex flex-col gap-y-1 rounded-lg border px-4 py-3">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Heading level="h2" className="tabular-nums">
      {value}
    </Heading>
    {detail && (
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {detail}
      </Text>
    )}
  </div>
);

export const config = defineRouteConfig({
  label: "Bag reminders",
});

export default CartRemindersPage;
