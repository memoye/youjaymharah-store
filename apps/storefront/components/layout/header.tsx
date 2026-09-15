"use client"

import { useCatalog } from "@/features/catalog/provider"
import { useStorefrontSettings } from "@/features/site-settings/provider"
import { cn } from "@/lib/util/cn"
import Image from "next/image"
import Link from "next/link"
// import { categoryPath } from "@/lib/seo/routes"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { DesktopNav } from "./desktop-nav"

export function Header() {
  const { brand } = useStorefrontSettings()
  const { categoryTree } = useCatalog()
  console.log(categoryTree)

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

          <DesktopNav />
        </div>

        <div className="flex h-12 items-stretch bg-red-500">
          <button className="bg-blue h-full">
            <MagnifyingGlassIcon />
          </button>
        </div>
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
