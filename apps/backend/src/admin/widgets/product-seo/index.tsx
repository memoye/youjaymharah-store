import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminProduct,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { sdk } from "../../lib/sdk";
import { withPermission } from "../../lib/permissions";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * A product's own title and description for search results and link
 * previews, kept in product metadata (`seo_title`, `seo_description`). Left
 * empty, the website uses the product title and its subtitle or description.
 */
const ProductSeoWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(text(product.metadata?.seo_title));
  const [description, setDescription] = useState(
    text(product.metadata?.seo_description),
  );

  // Re-sync when the host page refetches the product.
  useEffect(() => {
    setTitle(text(product.metadata?.seo_title));
    setDescription(text(product.metadata?.seo_description));
  }, [product.metadata?.seo_title, product.metadata?.seo_description]);

  const dirty =
    title !== text(product.metadata?.seo_title) ||
    description !== text(product.metadata?.seo_description);

  const save = useMutation({
    mutationFn: () =>
      sdk.admin.product.update(product.id, {
        // Product metadata merges, and an empty string removes the key.
        metadata: {
          seo_title: title.trim(),
          seo_description: description.trim(),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Search & sharing details saved.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Search & sharing</Heading>
      </div>
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Optional. Leave empty to use the product title and description.
        </Text>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="product-seo-title" size="small" weight="plus">
            Title
          </Label>
          <Input
            id="product-seo-title"
            value={title}
            maxLength={70}
            placeholder={product.title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {title.length}/{TITLE_LIMIT}. The store name is added after it.
          </Text>
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="product-seo-description" size="small" weight="plus">
            Description
          </Label>
          <Textarea
            id="product-seo-description"
            rows={3}
            value={description}
            maxLength={200}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {description.length}/{DESCRIPTION_LIMIT}
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          className="self-start"
          disabled={!dirty || save.isPending}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side",
});

export default withPermission(ProductSeoWidget, "product", "update");
