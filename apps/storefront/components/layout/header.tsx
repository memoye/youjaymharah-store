"use client"

import { useStorefrontSettings } from "@/features/site-settings/provider"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const { brand } = useStorefrontSettings()

  return (
    <header className="flex items-center border-b bg-background py-2">
      <Link href={"/"}>
        <Image
          src={brand.logo_url ?? ""}
          alt={brand.name}
          width={150}
          height={150}
          className="flex h-auto w-10 brightness-0"
        />
      </Link>

      {/*<div className="font-serif text-2xl font-medium">YouJaymharah Trends</div>*/}
    </header>
  )
}
