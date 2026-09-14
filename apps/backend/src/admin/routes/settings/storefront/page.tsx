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
  Textarea,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { sdk } from "../../../lib/sdk";

type Branding = {
  id: string;
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string | null;
};

const SOCIAL_NETWORKS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "pinterest", label: "Pinterest" },
] as const;

type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]["key"];

type StorefrontSettings = {
  id: string;
  new_badge_days: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  twitter_handle: string | null;
  social_links: Partial<Record<SocialNetwork, string | null>>;
  allow_indexing: boolean;
  google_site_verification: string | null;
};

const BRANDING_QUERY_KEY = ["branding"];
const SETTINGS_QUERY_KEY = ["storefront-settings"];

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

/** Staff without edit rights get a 403; say why instead of a raw error. */
function saveError(error: Error & { status?: number }, who: string) {
  toast.error(
    error.status === 403
      ? `Only ${who} can change these settings.`
      : error.message,
  );
}

async function uploadImage(file: File): Promise<string> {
  const { files } = await sdk.admin.upload.create({ files: [file] });
  const url = files[0]?.url;

  if (!url) {
    throw new Error("The upload did not return a file address.");
  }

  return url;
}

const StorefrontSettingsPage = () => (
  <div className="flex flex-col gap-y-3">
    <BrandSection />
    <SharingSection />
    <ProductsSection />
  </div>
);

// Brand -------------------------------------------------------------------

const BrandSection = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: () => sdk.client.fetch<{ branding: Branding }>("/admin/branding"),
  });

  const branding = data?.branding;

  return (
    <Section
      title="Brand"
      description="Your store's name, logo, browser icon and support address. The name, logo and support address also appear in customer emails."
      badge="Store owner"
      canEdit={Boolean(branding)}
      onEdit={() => setOpen(true)}
      isLoading={isLoading}
      error={error ? "You don't have access to the brand settings." : null}
    >
      {branding && (
        <>
          <Row label="Store name" value={branding.name} />
          <Row label="Support email" value={branding.support_email} />
          <ImageRow label="Logo" url={branding.logo_url} alt={branding.name} />
          <ImageRow
            label="Browser icon"
            url={branding.favicon_url}
            alt="Browser icon"
            square
          />
          <EditBrandDrawer
            branding={branding}
            open={open}
            onOpenChange={setOpen}
            onSaved={(updated) =>
              queryClient.setQueryData<{ branding: Branding }>(
                BRANDING_QUERY_KEY,
                { branding: updated },
              )
            }
          />
        </>
      )}
    </Section>
  );
};

const EditBrandDrawer = ({
  branding,
  open,
  onOpenChange,
  onSaved,
}: {
  branding: Branding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (branding: Branding) => void;
}) => {
  const [name, setName] = useState(branding.name);
  const [supportEmail, setSupportEmail] = useState(
    branding.support_email ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(branding.logo_url ?? "");
  const [faviconUrl, setFaviconUrl] = useState(branding.favicon_url ?? "");

  useEffect(() => {
    if (open) {
      setName(branding.name);
      setSupportEmail(branding.support_email ?? "");
      setLogoUrl(branding.logo_url ?? "");
      setFaviconUrl(branding.favicon_url ?? "");
    }
  }, [open, branding]);

  const upload = useMutation({
    mutationFn: ({ file }: { file: File; target: "logo" | "favicon" }) =>
      uploadImage(file),
    onSuccess: (url, { target }) =>
      target === "logo" ? setLogoUrl(url) : setFaviconUrl(url),
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ branding: Branding }>("/admin/branding", {
        method: "POST",
        body: {
          name: name.trim(),
          support_email: supportEmail.trim() || null,
          logo_url: logoUrl || null,
          favicon_url: faviconUrl || null,
        },
      }),
    onSuccess: ({ branding: updated }) => {
      toast.success("Brand settings updated.");
      onSaved(updated);
      onOpenChange(false);
    },
    onError: (error: Error & { status?: number }) =>
      saveError(error, "the store owner"),
  });

  const busy = save.isPending || upload.isPending;

  return (
    <EditDrawer
      title="Edit brand"
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      saving={save.isPending}
      canSave={Boolean(name.trim())}
      onSave={() => save.mutate()}
    >
      <Field id="brand-name" label="Store name">
        <Input
          id="brand-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field
        id="brand-support-email"
        label="Support email"
        hint="Shown at the bottom of every email you send."
      >
        <Input
          id="brand-support-email"
          type="email"
          value={supportEmail}
          onChange={(event) => setSupportEmail(event.target.value)}
        />
      </Field>
      <ImageField
        label="Logo"
        hint="PNG or SVG on a transparent background, around 240px wide."
        url={logoUrl}
        busy={busy}
        uploading={upload.isPending && upload.variables?.target === "logo"}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onUpload={(file) => upload.mutate({ file, target: "logo" })}
        onRemove={() => setLogoUrl("")}
      />
      <ImageField
        label="Browser icon (favicon)"
        hint="A square PNG, at least 512 x 512px. Also used when someone saves the site to their phone's home screen."
        url={faviconUrl}
        square
        busy={busy}
        uploading={upload.isPending && upload.variables?.target === "favicon"}
        accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
        onUpload={(file) => upload.mutate({ file, target: "favicon" })}
        onRemove={() => setFaviconUrl("")}
      />
    </EditDrawer>
  );
};

// Sharing & search ----------------------------------------------------------

const SharingSection = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () =>
      sdk.client.fetch<{ settings: StorefrontSettings }>(
        "/admin/storefront-settings",
      ),
  });

  const settings = data?.settings;
  const links = settings
    ? SOCIAL_NETWORKS.filter(({ key }) => settings.social_links?.[key])
    : [];

  return (
    <Section
      title="Sharing & search"
      description="How the store appears in search results and when a link is shared on WhatsApp, Instagram or X. Pages without their own details use these."
      badge="Marketing"
      canEdit={Boolean(settings)}
      onEdit={() => setOpen(true)}
      isLoading={isLoading}
      error={error ? "You don't have access to these settings." : null}
    >
      {settings && (
        <>
          {!settings.allow_indexing && (
            <div className="px-6 py-4">
              <Badge color="orange" size="small">
                Hidden from search engines
              </Badge>
            </div>
          )}
          <Row label="Home page title" value={settings.seo_title} />
          <Row label="Description" value={settings.seo_description} />
          <ImageRow
            label="Share image"
            url={settings.og_image_url}
            alt="Share image"
          />
          <Row label="X username" value={settings.twitter_handle} />
          <Row
            label="Social profiles"
            value={links.map(({ label }) => label).join(", ") || null}
          />
          <Row
            label="Google Search Console"
            value={
              settings.google_site_verification ? "Verified tag added" : null
            }
          />
          <EditSharingDrawer
            settings={settings}
            open={open}
            onOpenChange={setOpen}
            onSaved={(updated) =>
              queryClient.setQueryData<{ settings: StorefrontSettings }>(
                SETTINGS_QUERY_KEY,
                { settings: updated },
              )
            }
          />
        </>
      )}
    </Section>
  );
};

/** Accepts the whole `<meta name="google-site-verification" ...>` tag too. */
function verificationCode(value: string): string {
  const fromTag = value.match(/content=["']([^"']+)["']/i);
  return (fromTag?.[1] ?? value).trim();
}

const EditSharingDrawer = ({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [allowIndexing, setAllowIndexing] = useState(true);
  const [verification, setVerification] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(settings.seo_title ?? "");
      setDescription(settings.seo_description ?? "");
      setOgImageUrl(settings.og_image_url ?? "");
      setTwitterHandle(settings.twitter_handle ?? "");
      setSocialLinks(
        Object.fromEntries(
          SOCIAL_NETWORKS.map(({ key }) => [
            key,
            settings.social_links?.[key] ?? "",
          ]),
        ),
      );
      setAllowIndexing(settings.allow_indexing);
      setVerification(settings.google_site_verification ?? "");
    }
  }, [open, settings]);

  const upload = useMutation({
    mutationFn: uploadImage,
    onSuccess: setOgImageUrl,
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ settings: StorefrontSettings }>(
        "/admin/storefront-settings",
        {
          method: "POST",
          body: {
            seo_title: title.trim() || null,
            seo_description: description.trim() || null,
            og_image_url: ogImageUrl || null,
            twitter_handle: twitterHandle.trim() || null,
            social_links: Object.fromEntries(
              SOCIAL_NETWORKS.map(({ key }) => [
                key,
                socialLinks[key]?.trim() || null,
              ]),
            ),
            allow_indexing: allowIndexing,
            google_site_verification: verificationCode(verification) || null,
          },
        },
      ),
    onSuccess: ({ settings: updated }) => {
      toast.success("Sharing & search settings updated.");
      onSaved(updated);
      onOpenChange(false);
    },
    onError: (error: Error & { status?: number }) =>
      saveError(error, "Marketing and the store owner"),
  });

  const busy = save.isPending || upload.isPending;

  return (
    <EditDrawer
      title="Edit sharing & search"
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      saving={save.isPending}
      canSave
      onSave={() => save.mutate()}
    >
      <Field
        id="seo-title"
        label="Home page title"
        hint={`${title.length}/${TITLE_LIMIT}. Search results cut titles off at about ${TITLE_LIMIT} characters. Leave empty to use the store name. Other pages show "Page name | Store name".`}
      >
        <Input
          id="seo-title"
          value={title}
          maxLength={70}
          placeholder="Youjaymharah | Womenswear made in Lagos"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field
        id="seo-description"
        label="Description"
        hint={`${description.length}/${DESCRIPTION_LIMIT}. Shown under the title in search results and in link previews.`}
      >
        <Textarea
          id="seo-description"
          rows={3}
          value={description}
          maxLength={200}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <ImageField
        label="Share image"
        hint="Shown when a link to the store is shared. 1200 x 630px, with anything important away from the edges. Product pages use the product photo instead."
        url={ogImageUrl}
        busy={busy}
        uploading={upload.isPending}
        accept="image/png,image/jpeg,image/webp"
        onUpload={(file) => upload.mutate(file)}
        onRemove={() => setOgImageUrl("")}
      />
      <Field
        id="seo-twitter"
        label="X username"
        hint="Credits the store on link previews in X."
      >
        <Input
          id="seo-twitter"
          value={twitterHandle}
          placeholder="@youjaymharah"
          onChange={(event) => setTwitterHandle(event.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Social profiles
        </Label>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Full profile addresses. They tell search engines these accounts belong
          to the store, and the website can link to them.
        </Text>
        {SOCIAL_NETWORKS.map(({ key, label }) => (
          <div
            key={key}
            className="grid grid-cols-[96px_1fr] items-center gap-x-3"
          >
            <Label htmlFor={`social-${key}`} size="small">
              {label}
            </Label>
            <Input
              id={`social-${key}`}
              type="url"
              value={socialLinks[key] ?? ""}
              placeholder={`https://${key === "x" ? "x" : key}.com/youjaymharah`}
              onChange={(event) =>
                setSocialLinks((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>
      <Field
        id="seo-verification"
        label="Google Search Console verification"
        hint='In Search Console, choose the "HTML tag" method and paste the tag or just its code.'
      >
        <Input
          id="seo-verification"
          value={verification}
          onChange={(event) => setVerification(event.target.value)}
        />
      </Field>
      <div className="flex items-start justify-between gap-x-4 rounded-lg border border-ui-border-base px-4 py-3">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="seo-indexing" size="small" weight="plus">
            Show the store in search engines
          </Label>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Turn off only before launch or on a test copy of the store. While
            off, Google and others are asked not to list any page.
          </Text>
        </div>
        <Switch
          id="seo-indexing"
          checked={allowIndexing}
          onCheckedChange={setAllowIndexing}
        />
      </div>
    </EditDrawer>
  );
};

// Products ------------------------------------------------------------------

const ProductsSection = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () =>
      sdk.client.fetch<{ settings: StorefrontSettings }>(
        "/admin/storefront-settings",
      ),
  });

  const settings = data?.settings;

  return (
    <Section
      title="Products"
      description="How products are presented on the website."
      badge="Marketing & Store Manager"
      canEdit={Boolean(settings)}
      onEdit={() => setOpen(true)}
      isLoading={isLoading}
      error={error ? "You don't have access to these settings." : null}
    >
      {settings && (
        <>
          <Row
            label="New badge"
            value={`${settings.new_badge_days} ${settings.new_badge_days === 1 ? "day" : "days"}`}
            hint="Counted from launch for coming-soon products, otherwise from when the product was created."
          />
          <EditProductsDrawer
            settings={settings}
            open={open}
            onOpenChange={setOpen}
            onSaved={(updated) =>
              queryClient.setQueryData<{ settings: StorefrontSettings }>(
                SETTINGS_QUERY_KEY,
                { settings: updated },
              )
            }
          />
        </>
      )}
    </Section>
  );
};

const EditProductsDrawer = ({
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
      toast.success("Product settings updated.");
      onSaved(updated);
      onOpenChange(false);
    },
    onError: (err: Error & { status?: number }) =>
      saveError(err, "Marketing, the Store Manager and the store owner"),
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
    <EditDrawer
      title="Edit product settings"
      open={open}
      onOpenChange={onOpenChange}
      busy={save.isPending}
      saving={save.isPending}
      canSave
      onSave={onSave}
    >
      <Field
        id="storefront-new-badge-days"
        label="Show the New badge for"
        hint={
          error ??
          "Days, from 1 to 365. The website picks up a change within a few minutes."
        }
        error={Boolean(error)}
      >
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
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            days
          </Text>
        </div>
      </Field>
    </EditDrawer>
  );
};

// Shared pieces -------------------------------------------------------------

const Section = ({
  title,
  description,
  badge,
  canEdit,
  onEdit,
  isLoading,
  error,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  canEdit: boolean;
  onEdit: () => void;
  isLoading: boolean;
  error: string | null;
  children: ReactNode;
}) => (
  <Container className="divide-y p-0">
    <div className="flex items-start justify-between gap-x-4 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">{title}</Heading>
          <Badge size="2xsmall" color="grey">
            {badge}
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      <Button
        size="small"
        variant="secondary"
        disabled={!canEdit}
        onClick={onEdit}
      >
        <PencilSquare />
        Edit
      </Button>
    </div>
    {isLoading ? (
      <div className="flex items-center justify-center px-6 py-8">
        <Spinner className="animate-spin text-ui-fg-subtle" />
      </div>
    ) : error ? (
      <div className="px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {error}
        </Text>
      </div>
    ) : (
      children
    )}
  </Container>
);

const Row = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) => (
  <div className="grid grid-cols-2 items-start gap-x-4 px-6 py-4">
    <div className="flex flex-col gap-y-1">
      <Text size="small" leading="compact" weight="plus">
        {label}
      </Text>
      {hint && (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
    <Text
      size="small"
      leading="compact"
      className="break-words text-ui-fg-subtle"
    >
      {value || "Not set"}
    </Text>
  </div>
);

const ImageRow = ({
  label,
  url,
  alt,
  square,
}: {
  label: string;
  url: string | null;
  alt: string;
  square?: boolean;
}) => (
  <div className="grid grid-cols-2 items-center gap-x-4 px-6 py-4">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    {url ? (
      <img
        src={url}
        alt={alt}
        className={
          square
            ? "h-10 w-10 rounded object-contain"
            : "h-10 w-auto object-contain"
        }
      />
    ) : (
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        Not set
      </Text>
    )}
  </div>
);

const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: boolean;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus" htmlFor={id}>
      {label}
    </Label>
    {children}
    {hint && (
      <Text
        size="small"
        leading="compact"
        className={error ? "text-ui-fg-error" : "text-ui-fg-subtle"}
      >
        {hint}
      </Text>
    )}
  </div>
);

const ImageField = ({
  label,
  hint,
  url,
  square,
  busy,
  uploading,
  accept,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  url: string;
  square?: boolean;
  busy: boolean;
  uploading: boolean;
  accept: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      {url && (
        <img
          src={url}
          alt={`${label} preview`}
          className={
            square
              ? "h-16 w-16 rounded object-contain"
              : "h-24 w-auto self-start rounded object-contain"
          }
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUpload(file);
          }
          event.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Button
          size="small"
          variant="secondary"
          disabled={busy}
          isLoading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {url ? "Replace image" : "Upload image"}
        </Button>
        {url && (
          <Button
            size="small"
            variant="transparent"
            disabled={busy}
            onClick={onRemove}
          >
            Remove
          </Button>
        )}
      </div>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {hint}
      </Text>
    </div>
  );
};

const EditDrawer = ({
  title,
  open,
  onOpenChange,
  busy,
  saving,
  canSave,
  onSave,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  children: ReactNode;
}) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>{title}</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
        {children}
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
          disabled={busy || !canSave}
          isLoading={saving}
          onClick={onSave}
        >
          Save
        </Button>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer>
);

export const config = defineRouteConfig({
  label: "Storefront",
  rank: 1,
});

export default StorefrontSettingsPage;
