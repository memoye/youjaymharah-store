import type { HttpTypes } from "@medusajs/types"

import { metaText } from "./metadata"

type CategoryNode = Pick<
  HttpTypes.StoreProductCategory,
  "name" | "handle" | "rank"
> & {
  parent_category?: CategoryNode | null
  category_children?: CategoryNode[] | null
}

export type CategoryCrumb = { name: string; handle: string }

/**
 * A category and its ancestors from the top down, such as Women › Accessories
 * › Bags, for breadcrumbs and `breadcrumbJsonLd`. Needs the category fetched
 * with its parents (`getCategoryByHandle` does this).
 */
export function getCategoryTrail(category: CategoryNode): CategoryCrumb[] {
  const trail: CategoryCrumb[] = []
  const seen = new Set<string>()
  let current: CategoryNode | null | undefined = category

  while (current && !seen.has(current.handle)) {
    seen.add(current.handle)
    trail.unshift({ name: current.name, handle: current.handle })
    current = current.parent_category
  }

  return trail
}

/** Children in the admin's order, all the way down. Returns new arrays. */
export function sortCategoryTree<T extends CategoryNode>(categories: T[]): T[] {
  return [...categories]
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((category) => ({
      ...category,
      category_children: category.category_children
        ? sortCategoryTree(category.category_children as T[])
        : category.category_children,
    }))
}

/**
 * The title and description for a category page's metadata: staff's Search &
 * sharing box when filled in, otherwise the category's own name and
 * description. Needs `+metadata` in `fields`.
 */
export function getCategorySeo(
  category: Pick<
    HttpTypes.StoreProductCategory,
    "name" | "description" | "metadata"
  >,
): { title: string; description: string | null } {
  return {
    title: metaText(category.metadata?.seo_title) ?? category.name,
    description:
      metaText(category.metadata?.seo_description) ??
      metaText(category.description),
  }
}
