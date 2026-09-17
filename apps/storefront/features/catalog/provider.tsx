"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { CollectionMenu, MenuModel } from "@/lib/medusa/menu"

/**
 * Navigation data, built on the server in app/layout.tsx with
 * `getMenuModel()` and `getCollectionMenu()`. Only what the menus render
 * reaches the browser, not the full category and collection records.
 */
type CatalogValue = {
  menu: MenuModel
  collectionMenu: CollectionMenu
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  menu,
  collectionMenu,
  children,
}: CatalogValue & { children: ReactNode }) {
  return (
    <CatalogContext.Provider value={{ menu, collectionMenu }}>
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
