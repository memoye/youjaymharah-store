import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminCollection,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import {
  Button,
  Container,
  Heading,
  Label,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { sdk } from "../../lib/sdk";
import { uploadImage } from "../../lib/upload-image";

const DESCRIPTION_LIMIT = 500;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

type Content = {
  description: string;
  heroImage: string;
  heroImageMobile: string;
};

function contentFrom(
  metadata: Record<string, unknown> | null | undefined,
): Content {
  return {
    description: text(metadata?.description),
    heroImage: text(metadata?.hero_image),
    heroImageMobile: text(metadata?.hero_image_mobile),
  };
}

/**
 * What the website shows for a collection on its page and when it is featured
 * on the home page, kept in collection metadata (`description`, `hero_image`,
 * `hero_image_mobile`). Empty fields are saved as empty strings, which the
 * storefront treats as not set.
 */
const CollectionPageContentWidget = ({
  data: collection,
}: DetailWidgetProps<AdminCollection>) => {
  const queryClient = useQueryClient();
  const saved = contentFrom(collection.metadata);
  const [content, setContent] = useState<Content>(saved);

  // Re-sync when the host page refetches the collection.
  useEffect(() => {
    setContent(contentFrom(collection.metadata));
  }, [collection.metadata]);

  const dirty =
    content.description !== saved.description ||
    content.heroImage !== saved.heroImage ||
    content.heroImageMobile !== saved.heroImageMobile;

  const upload = useMutation({
    mutationFn: ({
      file,
    }: {
      file: File;
      target: "heroImage" | "heroImageMobile";
    }) => uploadImage(file),
    onSuccess: (url, { target }) =>
      setContent((current) => ({ ...current, [target]: url })),
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const save = useMutation({
    mutationFn: () =>
      sdk.admin.productCollection.update(collection.id, {
        // The existing metadata goes back with it, so other keys survive
        // whether the update merges or replaces.
        metadata: {
          ...(collection.metadata ?? {}),
          description: content.description.trim(),
          hero_image: content.heroImage,
          hero_image_mobile: content.heroImageMobile,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection page content saved.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = save.isPending || upload.isPending;

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading level="h2">Website content</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Shown on the collection's page, and on the home page when this is the
          featured collection (Settings › Storefront › Homepage).
        </Text>
      </div>
      <div className="flex flex-col gap-y-5 px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="collection-description" size="small" weight="plus">
            Description
          </Label>
          <Textarea
            id="collection-description"
            rows={3}
            value={content.description}
            maxLength={DESCRIPTION_LIMIT}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {content.description.length}/{DESCRIPTION_LIMIT}
          </Text>
        </div>
        <ImagePicker
          label="Banner image"
          hint="Landscape, at least 2400 x 1200px."
          url={content.heroImage}
          busy={busy}
          uploading={
            upload.isPending && upload.variables?.target === "heroImage"
          }
          onUpload={(file) => upload.mutate({ file, target: "heroImage" })}
          onRemove={() =>
            setContent((current) => ({ ...current, heroImage: "" }))
          }
        />
        <ImagePicker
          label="Mobile banner image (optional)"
          hint="Portrait, at least 1080 x 1350px. Phones use the banner image, cropped, when this is empty."
          url={content.heroImageMobile}
          busy={busy}
          uploading={
            upload.isPending && upload.variables?.target === "heroImageMobile"
          }
          onUpload={(file) =>
            upload.mutate({ file, target: "heroImageMobile" })
          }
          onRemove={() =>
            setContent((current) => ({ ...current, heroImageMobile: "" }))
          }
        />
        <Button
          size="small"
          variant="secondary"
          className="self-start"
          disabled={!dirty || busy}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
      </div>
    </Container>
  );
};

const ImagePicker = ({
  label,
  hint,
  url,
  busy,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  url: string;
  busy: boolean;
  uploading: boolean;
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
          className="h-24 w-auto self-start rounded object-contain"
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
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

export const config = defineWidgetConfig({
  zone: "product_collection.details.after",
});

export default CollectionPageContentWidget;
