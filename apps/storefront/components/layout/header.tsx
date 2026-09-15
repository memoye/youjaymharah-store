"use client"

import { useStorefrontSettings } from "@/features/site-settings/provider"
import { cn } from "@/lib/util/cn"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const { brand } = useStorefrontSettings()

  return (
    <header className="border-b bg-background px-5 sm:px-6">
      <div className="container-wrapper flex items-center justify-between">
        <div className="flex">
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

          {/*<ul>
            <li>NEW ARRIVALS</li>
          </ul>*/}
          {/*categoris here*/}
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
