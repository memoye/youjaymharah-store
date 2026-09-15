"use client"

import { useStorefrontSettings } from "@/features/site-settings/provider"
import Image from "next/image"

export function Header() {
  const { brand } = useStorefrontSettings()

  return (
    <header className="p-4 bg-background border-b">
      <Image
        src={brand.logo_url ?? ""}
        alt={brand.name}
        width={150}
        height={150}
      />
      <div className="font-serif text-2xl font-medium">YouJaymharah Trends</div>
    </header>
  )
}
