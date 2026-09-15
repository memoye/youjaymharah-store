"use client"

import { useCallback, useSyncExternalStore } from "react"

import type { MeasurementUnit } from "@/lib/medusa/size-guide"

const STORAGE_KEY = "size-guide-unit"

const listeners = new Set<() => void>()

/** Used when the browser refuses storage (private mode, blocked site data). */
let fallback: MeasurementUnit = "cm"

function read(): MeasurementUnit {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "in" || stored === "cm" ? stored : fallback
  } catch {
    return fallback
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

/**
 * The shopper's cm/inches choice for size guides, remembered in this browser
 * and shared by every guide on the page. Renders "cm" on the server and during
 * hydration, then switches to the stored choice.
 */
export function useMeasurementUnit() {
  const unit = useSyncExternalStore(subscribe, read, () => "cm" as const)

  const setUnit = useCallback((next: MeasurementUnit) => {
    fallback = next

    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the in-memory fallback still applies this visit.
    }

    for (const listener of listeners) {
      listener()
    }
  }, [])

  return [unit, setUnit] as const
}
