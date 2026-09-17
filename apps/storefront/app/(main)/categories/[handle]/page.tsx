import type { HttpTypes } from "@medusajs/types"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ProductList } from "@/components/catalog/product-list"
import {
  getCategoryByHandle,
  getCategoryTree,
  listProducts,
} from "@/lib/medusa/catalog"
import { getCategorySeo } from "@/lib/medusa/category"
import { getBreadcrumbs, getMenuModel } from "@/lib/medusa/menu"
import { categoryPath } from "@/lib/seo/routes"

// Stub: a working category page to replace with the designed one.

type Category = HttpTypes.StoreProductCategory

/** The category and everything under it, so Accessories lists bags too. */
function subtreeIds(category: Category): string[] {
  return [
    category.id,
    ...(category.category_children ?? []).flatMap(subtreeIds),
  ]
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[handle]">): Promise<Metadata> {
  const category = await getCategoryByHandle((await params).handle)

  if (!category) {
    return {}
  }

  const seo = getCategorySeo(category)

  return { title: seo.title, description: seo.description ?? undefined }
}

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[handle]">) {
  const category = await getCategoryByHandle((await params).handle)

  if (!category) {
    notFound()
  }

  const [tree, { products, count }] = await Promise.all([
    getCategoryTree(),
    listProducts({ categoryId: subtreeIds(category) }),
  ])
  const breadcrumbs = getBreadcrumbs(category, getMenuModel(tree))
  const children = category.category_children ?? []

  return (
    <main className="container-wrapper px-5 py-10 sm:px-6">
      {breadcrumbs.length > 1 && (
        <nav
          aria-label="Breadcrumb"
          className="text-[12px] text-muted-foreground"
        >
          <ol className="flex flex-wrap gap-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.handle} className="flex gap-2">
                {index > 0 && <span aria-hidden>/</span>}
                {index === breadcrumbs.length - 1 ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <h1 className="mt-4 text-2xl font-medium tracking-[-0.01em]">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 max-w-[65ch] text-[15px] text-muted-foreground">
          {category.description}
        </p>
      )}

      {children.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={categoryPath(child.handle)}
                className="hover:underline"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 mb-4 text-[13px] text-muted-foreground">
        {count} {count === 1 ? "item" : "items"}
      </p>
      <ProductList products={products} />
    </main>
  )
}
