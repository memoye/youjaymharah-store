import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminProductCategory,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import { Container, Heading, Label, Select, Text, toast } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sdk } from "../../lib/sdk";
import { usePermissions, withPermission } from "../../lib/permissions";
import {
  fetchSizeGuides,
  SIZE_GUIDES_QUERY_KEY,
} from "../../components/size-guide/size-guide-data";

type CategorySizeGuide = {
  size_guide_id: string | null;
  inherited: {
    size_guide: { id: string; name: string };
    category: { id: string; name: string };
  } | null;
};

const NONE = "none";

/** The size guide this category's products show, unless they set their own. */
const CategorySizeGuideWidget = ({
  data: category,
}: DetailWidgetProps<AdminProductCategory>) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can("product_category", "update");
  const queryKey = ["size-guide-assignment", "category", category.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      sdk.client.fetch<CategorySizeGuide>(
        `/admin/product-categories/${category.id}/size-guide`,
      ),
  });

  const { data: guides } = useQuery({
    queryKey: SIZE_GUIDES_QUERY_KEY,
    queryFn: fetchSizeGuides,
  });

  const assign = useMutation({
    mutationFn: (sizeGuideId: string | null) =>
      sdk.client.fetch<CategorySizeGuide>(
        `/admin/product-categories/${category.id}/size-guide`,
        { method: "POST", body: { size_guide_id: sizeGuideId } },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      // Products in this category may now show a different guide.
      void queryClient.invalidateQueries({
        queryKey: ["size-guide-assignment"],
      });
      void queryClient.invalidateQueries({ queryKey: SIZE_GUIDES_QUERY_KEY });
      toast.success("Size guide updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inherited = data?.inherited;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Size guide</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="category-size-guide" size="small" weight="plus">
            Guide for products in this category
          </Label>
          <Select
            value={data?.size_guide_id ?? NONE}
            disabled={!canEdit || isLoading || assign.isPending}
            onValueChange={(value) =>
              assign.mutate(value === NONE ? null : value)
            }
          >
            <Select.Trigger id="category-size-guide">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={NONE}>
                {inherited
                  ? `None: use ${inherited.category.name}'s guide`
                  : "None"}
              </Select.Item>
              {(guides?.size_guides ?? []).map((guide) => (
                <Select.Item key={guide.id} value={guide.id}>
                  {guide.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {isLoading
            ? "Loading…"
            : data?.size_guide_id
              ? "Subcategories without their own guide use this one too. Products can override it."
              : inherited
                ? `Products here show "${inherited.size_guide.name}" from ${inherited.category.name}.`
                : "Products here show the store default size guide, if there is one."}
        </Text>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product_category.details.side",
});

export default withPermission(
  CategorySizeGuideWidget,
  "product_category",
  "read",
);
