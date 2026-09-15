"use client"

import { useStorefrontSettings } from "@/features/site-settings/provider"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const { brand } = useStorefrontSettings()

  return (
    <header className="py-2 flex items-center bg-background border-b">
      <Link href={"/"}>
        <Image
          src={brand.logo_url ?? ""}
          alt={brand.name}
          width={150}
          height={150}
          className="w-10 h-auto brightness-0"
        />
      </Link>

      {/*<div className="font-serif text-2xl font-medium">YouJaymharah Trends</div>*/}
    </header>
  )
}
