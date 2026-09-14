import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminProductCategory,
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

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * A category's own title and description for search results and link
 * previews, kept in category metadata (`seo_title`, `seo_description`). Left
 * empty, the website uses the category name and description.
 */
const CategorySeoWidget = ({
  data: category,
}: DetailWidgetProps<AdminProductCategory>) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(text(category.metadata?.seo_title));
  const [description, setDescription] = useState(
    text(category.metadata?.seo_description),
  );

  // Re-sync when the host page refetches the category.
  useEffect(() => {
    setTitle(text(category.metadata?.seo_title));
    setDescription(text(category.metadata?.seo_description));
  }, [category.metadata?.seo_title, category.metadata?.seo_description]);

  const dirty =
    title !== text(category.metadata?.seo_title) ||
    description !== text(category.metadata?.seo_description);

  const save = useMutation({
    mutationFn: () =>
      sdk.admin.productCategory.update(category.id, {
        // The existing metadata goes back with it, so other keys survive
        // whether the update merges or replaces. The storefront treats an
        // empty string as "not set".
        metadata: {
          ...(category.metadata ?? {}),
          seo_title: title.trim(),
          seo_description: description.trim(),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product_categories"] });
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
          Optional. Leave empty to use the category name and description.
        </Text>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="category-seo-title" size="small" weight="plus">
            Title
          </Label>
          <Input
            id="category-seo-title"
            value={title}
            maxLength={70}
            placeholder={category.name}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {title.length}/{TITLE_LIMIT}. The store name is added after it.
          </Text>
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="category-seo-description" size="small" weight="plus">
            Description
          </Label>
          <Textarea
            id="category-seo-description"
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
  zone: "product_category.details.side",
});

export default CategorySeoWidget;
