"use client"

import {
  BagIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from "@phosphor-icons/react"
import NextLink from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SHOPPING_BAG_PATH } from "@/lib/seo/routes"
import { cn } from "@/lib/util/cn"

export function UtilityNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Utility"
      className={cn("flex *:h-auto max-lg:gap-2", className)}
    >
      <UtilityItem label="Search">
        <MagnifyingGlassIcon />
      </UtilityItem>

      <UtilityItem label="Wishlist">
        <HeartIcon />
      </UtilityItem>

      <UtilityItem label="Account">
        <UserIcon />
        <span
          aria-hidden
          className="absolute bottom-1/5 left-1/2 inline-block size-1 -translate-x-1/2 rounded-full bg-gold"
        />
        <span
          aria-hidden
          className="absolute bottom-1/5 left-1/2 inline-block size-1 -translate-x-1/2 animate-ping rounded-full bg-gold motion-reduce:animate-none"
        />
      </UtilityItem>

      <UtilityItem label="Shopping bag" href={SHOPPING_BAG_PATH}>
        <BagIcon />
      </UtilityItem>
    </nav>
  )
}

function UtilityItem({
  label,
  href,
  children,
}: {
  label: string
  href?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={label}
            className="relative"
            render={href ? <NextLink href={href} /> : undefined}
          />
        }
      >
        {children}
      </TooltipTrigger>

      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
