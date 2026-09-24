"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { useHeaderTone } from "@/features/layout/header-overlay"
import { useStorefrontSettings } from "@/features/site-settings/provider"
import { cn } from "@/lib/util/cn"

import { DesktopNav } from "./desktop-nav"
import { MobileNav } from "./mobile-nav"
import { UtilityNav } from "./utility-nav"

export function Header() {
  const { brand } = useStorefrontSettings()
  // The desktop menus open full width under this element.
  const headerRef = useRef<HTMLElement>(null)
  const { tone, setHeight } = useHeaderTone()
  const overlaid = tone !== null

  // The overlay decides when to go solid from where this bar ends, so it needs
  // the measured height rather than a constant that padding would drift from.
  useEffect(() => {
    const element = headerRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    )

    observer.observe(element)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        "group fixed top-0 z-100 w-full border-b px-5 transition-colors duration-300 sm:px-6",
        overlaid
          ? "border-transparent bg-transparent"
          : "bg-background text-foreground",
        tone === "light" && "text-white",
        tone === "dark" && "text-foreground",
        // A menu panel opens flush under the bar with its own background, so
        // the bar has to be solid behind it whatever the page asked for.
        "has-data-popup-open:border-border has-data-popup-open:bg-background has-data-popup-open:text-foreground",
      )}
    >
      <div className="container-wrapper flex items-stretch justify-between">
        <div className="flex items-center justify-between gap-6">
          <MobileNav />

          <Link
            href={"/"}
            className={cn(
              "relative z-10 hidden py-1 transition-[filter] *:brightness-0 hover:*:brightness-100 md:inline-flex",
              tone === "light" &&
                "*:invert group-has-data-popup-open:*:invert-0 hover:*:brightness-100 hover:*:invert-0",
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
