"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"

import { useStorefrontSettings } from "@/features/site-settings/provider"
import { cn } from "@/lib/util/cn"

import { DesktopNav } from "./desktop-nav"
import { MobileNav } from "./mobile-nav"
import { UtilityNav } from "./utility-nav"

export function Header() {
  const { brand } = useStorefrontSettings()
  // The desktop menus open full width under this element.
  const headerRef = useRef<HTMLElement>(null)

  return (
    <header ref={headerRef} className="border-b bg-background px-5 sm:px-6">
      <div className="container-wrapper flex items-stretch justify-between">
        <div className="flex items-center justify-between gap-6">
          <MobileNav />

          <Link
            href={"/"}
            className={cn(
              "relative z-10 hidden py-1 transition-[filter] *:brightness-0 hover:*:brightness-100 md:inline-flex",
              'before:absolute before:inset-x-0 before:bottom-0 before:-z-1 before:block before:h-2/3 before:bg-transparent before:content-[""]',
              "before:transition-[height,background-color] hover:before:h-full hover:before:bg-primary",
            )}
          >
            {brand.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={brand.name}
                width={150}
                height={150}
                className="h-auto w-10"
                title={brand.name}
              />
            ) : (
              <span className="text-[15px] font-medium">{brand.name}</span>
            )}

            <span className="sr-only">Home</span>
          </Link>

          <DesktopNav anchor={headerRef} />
        </div>

        <Link
          href={"/"}
          className={cn(
            "relative z-10 inline-flex items-center px-4 py-2 transition-colors hover:text-primary-foreground md:hidden",
            'before:absolute before:inset-x-0 before:bottom-0 before:-z-1 before:block before:h-2/3 before:bg-transparent before:content-[""]',
            "before:transition-[height,background-color] hover:before:h-full hover:before:bg-primary",
            "font-display text-display-lg text-[15px] font-semibold",
          )}
        >
          {brand.name}

          <span className="sr-only">Home</span>
        </Link>

        <UtilityNav />
      </div>
    </header>
  )
}
