import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { AnnouncementOptionsQuery } from "../../../../modules/storefront-settings/announcements";

/** Small, paginated picker available to staff who can manage storefront content. */
export const GET = async (
  req: AuthenticatedMedusaRequest<unknown, AnnouncementOptionsQuery>,
  res: MedusaResponse,
) => {
  const { type, q, id, offset } = req.validatedQuery;
  const configs = {
    collection: { entity: "product_collection", label: "title" },
    category: { entity: "product_category", label: "name" },
    product: { entity: "product", label: "title" },
    promotion: { entity: "promotion", label: "code" },
  };
  const config = configs[type];
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data, metadata } = await query.graph({
    entity: config.entity,
    fields: ["id", config.label],
    filters: {
      ...(id ? { id } : q ? { [config.label]: { $ilike: `%${q}%` } } : {}),
      ...(type === "category" ? { is_active: true, is_internal: false } : {}),
      ...(type === "product" ? { status: "published" } : {}),
    },
    pagination: { skip: offset, take: 20, order: { [config.label]: "ASC" } },
  });
  res.json({
    options: data.map((item) => ({
      id: item.id,
      label: item[config.label] ?? item.id,
    })),
    count: metadata?.count ?? data.length,
    offset,
    limit: 20,
  });
};
