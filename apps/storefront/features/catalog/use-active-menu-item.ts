"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"

import { findActiveMenuItem } from "@/lib/medusa/menu"

import { useCatalog } from "./provider"

/**
 * The department, column and link the current page belongs to, for
 * highlighting the menu (on /categories/women-bags: Accessories and Bags).
 */
export function useActiveMenuItem() {
  const { menu } = useCatalog()
  const pathname = usePathname()

  return useMemo(() => findActiveMenuItem(menu, pathname), [menu, pathname])
}
