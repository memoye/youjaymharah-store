import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminProduct,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import { Container, Heading, Label, Select, Text, toast } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sdk } from "../../lib/sdk";
import {
  fetchSizeGuides,
  SIZE_GUIDES_QUERY_KEY,
} from "../../components/size-guide/size-guide-data";

type ProductSizeGuide = {
  size_guide_id: string | null;
  resolved: {
    size_guide: { id: string; name: string } | null;
    source: "product" | "category" | "default" | null;
    category: { id: string; name: string } | null;
  };
};

/** Select can't hold an empty value, so "no override" has its own. */
const INHERIT = "inherit";

function describe(resolved: ProductSizeGuide["resolved"] | undefined): string {
  if (!resolved?.size_guide) {
    return "No size guide applies, so the website hides the size guide link.";
  }

  switch (resolved.source) {
    case "product":
      return `Shows "${resolved.size_guide.name}", set on this product.`;
    case "category":
      return `Shows "${resolved.size_guide.name}" from the ${resolved.category?.name} category.`;
    default:
      return `Shows "${resolved.size_guide.name}", the store default.`;
  }
}

/** Which size guide the product page shows, and an override for it. */
const ProductSizeGuideWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient();
  const queryKey = ["size-guide-assignment", "product", product.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      sdk.client.fetch<ProductSizeGuide>(
        `/admin/products/${product.id}/size-guide`,
      ),
  });

  const { data: guides } = useQuery({
    queryKey: SIZE_GUIDES_QUERY_KEY,
    queryFn: fetchSizeGuides,
  });

  const assign = useMutation({
    mutationFn: (sizeGuideId: string | null) =>
      sdk.client.fetch<ProductSizeGuide>(
        `/admin/products/${product.id}/size-guide`,
        { method: "POST", body: { size_guide_id: sizeGuideId } },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      void queryClient.invalidateQueries({ queryKey: SIZE_GUIDES_QUERY_KEY });
      toast.success("Size guide updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Size guide</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {isLoading ? "Loading…" : describe(data?.resolved)}
        </Text>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="product-size-guide" size="small" weight="plus">
            Override for this product
          </Label>
          <Select
            value={data?.size_guide_id ?? INHERIT}
            disabled={isLoading || assign.isPending}
            onValueChange={(value) =>
              assign.mutate(value === INHERIT ? null : value)
            }
          >
            <Select.Trigger id="product-size-guide">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={INHERIT}>
                None: use the category's guide
              </Select.Item>
              {(guides?.size_guides ?? []).map((guide) => (
                <Select.Item key={guide.id} value={guide.id}>
                  {guide.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side",
});

export default ProductSizeGuideWidget;
