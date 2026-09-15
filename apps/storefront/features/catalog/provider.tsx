"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { HttpTypes } from "@medusajs/types"

type CatalogCategory = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle"
>

type CatalogCollection = Pick<
  HttpTypes.StoreCollection,
  "id" | "title" | "handle"
>

type CatalogValue = {
  categories: CatalogCategory[]
  collections: CatalogCollection[]
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  categories,
  collections,
  children,
}: CatalogValue & { children: ReactNode }) {
  return (
    <CatalogContext.Provider value={{ categories, collections }}>
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
