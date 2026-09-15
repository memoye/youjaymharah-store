"use client"

import { useCatalog } from "@/features/catalog/provider"
import { useStorefrontSettings } from "@/features/site-settings/provider"
import { cn } from "@/lib/util/cn"
import Image from "next/image"
import Link from "next/link"
import { categoryPath } from "@/lib/seo/routes"

export function Header() {
  const { brand } = useStorefrontSettings()
  const { categories } = useCatalog()

  return (
    <header className="border-b bg-background px-5 sm:px-6">
      <div className="container-wrapper flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={"/"}
            className={cn(
              "relative z-10 inline-flex py-1 transition-[filter] *:brightness-0 hover:*:brightness-100",
              'before:absolute before:inset-x-0 before:bottom-0 before:-z-1 before:block before:h-2/3 before:bg-transparent before:content-[""]',
              "before:transition-[height,background-color] hover:before:h-full hover:before:bg-primary",
            )}
          >
            <Image
              src={brand.logo_url ?? ""}
              alt={brand.name}
              width={150}
              height={150}
              className="h-auto w-10"
              title={brand.name}
            />

            <span className="sr-only">Home</span>
          </Link>

          <nav
            aria-label="Catalogue"
            className="hidden items-center gap-6 md:flex"
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryPath(category.handle)}
                className="text-[13px] font-medium tracking-[0.02em] transition-colors hover:text-muted-foreground"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="block h-full w-2 bg-black"></div>
        {/*<nav>
          <ul className="flex items-center gap-4">
            <li>Search</li>
            <li>Wishlist</li>
            <li>Shopping bag</li>
          </ul>
        </nav>*/}
      </div>
    </header>
  )
}
