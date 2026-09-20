import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Plus, Spinner, TriangleRightMini } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { SizeGuideEditor } from "../../components/size-guide/size-guide-editor";
import { usePermissions } from "../../lib/permissions";
import {
  type AdminSizeGuide,
  fetchSizeGuides,
  fetchSizeValues,
  SIZE_GUIDES_QUERY_KEY,
  SIZE_VALUES_QUERY_KEY,
} from "../../components/size-guide/size-guide-data";

function usage(guide: AdminSizeGuide): string {
  const parts: string[] = [];

  if (guide.categories.length) {
    parts.push(guide.categories.map((category) => category.name).join(", "));
  }

  if (guide.product_count) {
    parts.push(
      `${guide.product_count} ${guide.product_count === 1 ? "product" : "products"}`,
    );
  }

  return parts.length ? `Used by ${parts.join(" · ")}` : "Not used yet";
}

const SizeGuidesPage = () => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSizeGuide | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: SIZE_GUIDES_QUERY_KEY,
    queryFn: fetchSizeGuides,
  });

  const { data: sizes = [] } = useQuery({
    queryKey: SIZE_VALUES_QUERY_KEY,
    queryFn: fetchSizeValues,
  });

  const guides = data?.size_guides ?? [];

  const openEditor = (guide: AdminSizeGuide | null) => {
    setEditing(guide);
    setEditorOpen(true);
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Size guides</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Measurement tables shown on product pages. Set a category's guide on
            the category page, or override it on a product.
          </Text>
        </div>
        {can("size_guide", "create") && (
          <Button
            size="small"
            variant="secondary"
            onClick={() => openEditor(null)}
          >
            <Plus />
            Create
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center px-6 py-8">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : !guides.length ? (
        <div className="px-6 py-8">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            No size guides yet. Create one, then choose it on a category so its
            products show it.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-y-2 px-6 py-4">
          {guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => openEditor(guide)}
              className="focus-visible:shadow-borders-interactive-with-focus [&:hover>div]:bg-ui-bg-component-hover rounded-md text-left outline-none"
            >
              <div className="bg-ui-bg-component shadow-elevation-card-rest rounded-md px-4 py-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col gap-y-1">
                    <div className="flex items-center gap-x-2">
                      <Text size="small" leading="compact" weight="plus">
                        {guide.name}
                      </Text>
                      {guide.is_default && (
                        <Badge size="2xsmall" color="blue">
                          Store default
                        </Badge>
                      )}
                    </div>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {guide.table.rows.map((row) => row.size).join(", ")} ·{" "}
                      {usage(guide)}
                    </Text>
                  </div>
                  <TriangleRightMini className="text-ui-fg-muted rtl:rotate-180" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <SizeGuideEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        guide={editing}
        sizes={sizes}
        canSave={can("size_guide", editing ? "update" : "create")}
        canDelete={can("size_guide", "delete")}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: SIZE_GUIDES_QUERY_KEY,
          });
          // Product and category boxes show which guide applies.
          void queryClient.invalidateQueries({
            queryKey: ["size-guide-assignment"],
          });
        }}
      />
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Size guides",
  nested: "/products",
});

export default SizeGuidesPage;
