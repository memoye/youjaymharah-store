"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { HttpTypes } from "@medusajs/types"

type CatalogCategory = HttpTypes.StoreProductCategory

type CatalogCollection = HttpTypes.StoreCollection

type CatalogValue = {
  categoryTree: CatalogCategory[]
  collections: CatalogCollection[]
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  categoryTree,
  collections,
  children,
}: CatalogValue & { children: ReactNode }) {
  return (
    <CatalogContext.Provider value={{ categoryTree, collections }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) {
    throw new Error(
      "useCatalog() needs <CatalogProvider> in app/(main)/layout.tsx",
    )
  }
  return value
}
