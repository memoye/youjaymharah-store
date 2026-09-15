"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { StorefrontSettings } from "@/lib/medusa/storefront-settings"

const StorefrontSettingsContext = createContext<StorefrontSettings | null>(null)

export function StorefrontSettingsProvider({
  settings,
  children,
}: {
  settings: StorefrontSettings
  children: ReactNode
}) {
  return (
    <StorefrontSettingsContext.Provider value={settings}>
      {children}
    </StorefrontSettingsContext.Provider>
  )
}

export function useStorefrontSettings(): StorefrontSettings {
  const settings = useContext(StorefrontSettingsContext)
  if (!settings) {
    throw new Error(
      "useStorefrontSettings() needs <StorefrontSettingsProvider> in app/layout.tsx",
    )
  }
  return settings
}
