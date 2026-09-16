"use client"

import { useCatalog } from "@/features/catalog/provider"
import { categoryPath } from "@/lib/seo/routes"
import Link from "next/link"

export function DesktopNav() {
  const { categoryTree: categories } = useCatalog()

  return (
    <>
      <nav aria-label="Catalogue" className="hidden items-center gap-6 md:flex">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={categoryPath(category.handle)}
            className="text-[13px] font-medium tracking-[0.02em] uppercase transition-colors hover:text-muted-foreground"
          >
            {category.name}
          </Link>
        ))}

        <Link
          href={"#"}
          className="text-[13px] font-medium tracking-[0.02em] transition-colors hover:text-muted-foreground"
        >
          NEW ARRIVALS
        </Link>

        <Link
          href={"#"}
          className="text-[13px] font-medium tracking-[0.02em] transition-colors hover:text-muted-foreground"
        >
          CATEGORIES
        </Link>
      </nav>
      <MegaMenu />
    </>
  )
}

function MegaMenu() {
  return <div></div>
}
