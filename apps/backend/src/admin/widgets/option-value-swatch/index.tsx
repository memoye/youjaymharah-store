import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { PencilSquare } from "@medusajs/icons";
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

import { sdk } from "../../lib/sdk";

type AdminOptionValue = {
  id: string;
  value: string;
  option_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Swatch = { hex: string; swatch_image: string };

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Options whose values are colours get the swatch editor. */
const isColourOption = (title?: string | null) =>
  !!title && /colou?r/i.test(title);

const readSwatch = (metadata?: Record<string, unknown> | null): Swatch => ({
  hex: typeof metadata?.hex === "string" ? metadata.hex : "",
  swatch_image:
    typeof metadata?.swatch_image === "string" ? metadata.swatch_image : "",
});

/**
 * Colour swatches for the storefront. The hex code (and optional pattern
 * image, for prints and stripes) lives in the option value's metadata as
 * `hex` / `swatch_image`, so the Store API returns it with every product
 * that uses the colour -- no backend changes needed.
 */
const OptionValueSwatchWidget = ({ data }: { data?: AdminOptionValue }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Swatch>(readSwatch(data?.metadata));
  const [draft, setDraft] = useState<Swatch>(saved);

  // Re-sync when the host page refetches the value.
  useEffect(() => {
    setSaved(readSwatch(data?.metadata));
  }, [data?.metadata]);

  useEffect(() => {
    if (open) {
      setDraft(saved);
    }
  }, [open, saved]);

  // Display query: which option this value belongs to decides whether the
  // widget applies at all.
  const { data: optionData, isLoading } = useQuery({
    queryKey: ["option-value-swatch", "option", data?.option_id],
    queryFn: () => sdk.admin.productOption.retrieve(data!.option_id!),
    enabled: !!data?.option_id,
  });

  const save = useMutation({
    mutationFn: (swatch: Swatch) =>
      sdk.admin.productOption.updateValue(data!.option_id!, data!.id, {
        // Empty strings remove a key, per Medusa's metadata semantics.
        metadata: { ...(data!.metadata ?? {}), ...swatch },
      }),
    onSuccess: (_response, swatch) => {
      setSaved(swatch);
      setOpen(false);
      // Refresh the host page's cached value so `data` stays current.
      queryClient.invalidateQueries({
        predicate: (q) => JSON.stringify(q.queryKey).includes("product_option"),
      });
      toast.success("Swatch saved.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { files } = await sdk.admin.upload.create({ files: [file] });
      const url = files[0]?.url;
      if (!url) {
        throw new Error("Upload produced no file URL");
      }
      return url;
    },
    onSuccess: (url) => setDraft((d) => ({ ...d, swatch_image: url })),
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  if (!data?.option_id) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  // Only colour options, or values that already carry a swatch.
  if (
    !isColourOption(optionData?.product_option?.title) &&
    !saved.hex &&
    !saved.swatch_image
  ) {
    return null;
  }

  const hexValid = draft.hex === "" || HEX_PATTERN.test(draft.hex);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Swatch</Heading>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-label="Edit swatch"
        >
          <PencilSquare />
        </Button>
      </div>
      <div className="flex items-center gap-4 px-6 py-4">
        <SwatchPreview swatch={saved} label={data.value} size="large" />
        <div className="flex flex-col gap-1">
          <Text size="small" leading="compact" weight="plus">
            {saved.hex || "No colour set"}
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {saved.swatch_image
              ? "Pattern image shown instead of the colour."
              : "Shown as the colour square on the storefront."}
          </Text>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit swatch for {data.value}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="swatch-hex" size="small" weight="plus">
                Colour
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="swatch-colour-picker"
                  type="color"
                  aria-label="Pick a colour"
                  value={HEX_PATTERN.test(draft.hex) ? draft.hex : "#000000"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, hex: e.target.value }))
                  }
                  className="h-8 w-10 cursor-pointer rounded-md border border-ui-border-base bg-ui-bg-field"
                />
                <Input
                  id="swatch-hex"
                  size="small"
                  placeholder="#1c1c1c"
                  value={draft.hex}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, hex: e.target.value.trim() }))
                  }
                  aria-invalid={!hexValid}
                />
              </div>
              {!hexValid && (
                <Text size="small" className="text-ui-fg-error">
                  Use a six-digit hex code, like #1c1c1c.
                </Text>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="swatch-image" size="small" weight="plus">
                Pattern image (optional)
              </Label>
              <Text size="small" className="text-ui-fg-subtle">
                For prints and stripes. Upload a small square crop of the
                fabric; it replaces the colour square.
              </Text>
              <div className="flex items-center gap-3">
                <SwatchPreview swatch={draft} label={data.value} />
                <input
                  id="swatch-image"
                  type="file"
                  accept="image/*"
                  className="text-ui-fg-subtle text-small"
                  disabled={upload.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      upload.mutate(file);
                    }
                  }}
                />
                {draft.swatch_image && (
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() =>
                      setDraft((d) => ({ ...d, swatch_image: "" }))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={() => save.mutate(draft)}
              isLoading={save.isPending}
              disabled={!hexValid || save.isPending || upload.isPending}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

const SwatchPreview = ({
  swatch,
  label,
  size = "small",
}: {
  swatch: Swatch;
  label: string;
  size?: "small" | "large";
}) => {
  const dimension = size === "large" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div
      role="img"
      aria-label={`${label} swatch`}
      className={`${dimension} shrink-0 rounded-md border border-ui-border-base bg-ui-bg-subtle bg-cover bg-center`}
      style={
        swatch.swatch_image
          ? { backgroundImage: `url(${swatch.swatch_image})` }
          : HEX_PATTERN.test(swatch.hex)
            ? { backgroundColor: swatch.hex }
            : undefined
      }
    />
  );
};

export const config = defineWidgetConfig({
  zone: "product_option_value.details",
});

export default OptionValueSwatchWidget;
