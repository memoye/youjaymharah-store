"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { CollectionMenu, MenuModel } from "@/lib/medusa/menu"

export type StoreMenuPromo = {
  title: string
  href: string
  image_url: string
  mobile_image_url: string | null
}

/**
 * Navigation data, built on the server in app/layout.tsx with
 * `getMenuModel()` and `getCollectionMenu()`. Only what the menus render
 * reaches the browser, not the full category and collection records.
 */
type CatalogValue = {
  menu: MenuModel
  collectionMenu: CollectionMenu
  storeMenuCards: StoreMenuPromo[]
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  menu,
  collectionMenu,
  storeMenuCards,
  children,
}: CatalogValue & { children: ReactNode }) {
  return (
    <CatalogContext.Provider value={{ menu, collectionMenu, storeMenuCards }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) {
    throw new Error("useCatalog() needs <CatalogProvider> in app/layout.tsx")
  }
  return value
}
