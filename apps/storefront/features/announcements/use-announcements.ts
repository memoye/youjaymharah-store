"use client"

import { useEffect, useState } from "react"
import {
  adjacentAnnouncementId,
  announcementMode,
  dismissalKey,
  snapshotLifetime,
  visibleAnnouncements,
  type AnnouncementSnapshot,
} from "./helpers"

const STORAGE_KEY = "storefront-announcement-dismissals-v1"

export function useAnnouncements() {
  const [snapshot, setSnapshot] = useState<AnnouncementSnapshot | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let storageLoaded = false
    let controller: AbortController | null = null
    let refreshTimer: ReturnType<typeof setTimeout>
    let expiryTimer: ReturnType<typeof setTimeout>
    let expiresAt = 0

    const refresh = async () => {
      if (disposed || document.visibilityState === "hidden" || controller)
        return
      clearTimeout(refreshTimer)
      controller = new AbortController()
      const started = performance.now()
      const timeout = setTimeout(() => controller?.abort(), 12_000)
      try {
        const response = await fetch("/api/announcements", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Announcements unavailable")
        const data: AnnouncementSnapshot = await response.json()
        if (disposed) return
        if (!storageLoaded) {
          storageLoaded = true
          try {
            const stored: unknown = JSON.parse(
              sessionStorage.getItem(STORAGE_KEY) ?? "[]",
            )
            if (Array.isArray(stored))
              setDismissed(
                stored.filter(
                  (value): value is string => typeof value === "string",
                ),
              )
          } catch {
            /* Storage can be unavailable in private browsing. */
          }
        }
        const lifetime = snapshotLifetime(data, performance.now() - started)
        clearTimeout(expiryTimer)
        expiresAt = performance.now() + lifetime
        setSnapshot(lifetime > 0 && Array.isArray(data.items) ? data : null)
        expiryTimer = setTimeout(() => setSnapshot(null), lifetime)
        refreshTimer = setTimeout(
          () => void refresh(),
          lifetime > 10_000 ? lifetime - 5000 : Math.max(1000, lifetime),
        )
      } catch {
        if (!disposed) {
          clearTimeout(expiryTimer)
          setSnapshot(null)
          refreshTimer = setTimeout(() => void refresh(), 15_000)
        }
      } finally {
        clearTimeout(timeout)
        controller = null
      }
    }

    const resume = () => {
      // Timers may have been suspended while the tab was in the background.
      if (performance.now() >= expiresAt) setSnapshot(null)
      void refresh()
    }
    void refresh()
    document.addEventListener("visibilitychange", resume)
    window.addEventListener("focus", resume)
    window.addEventListener("online", resume)
    return () => {
      disposed = true
      controller?.abort()
      clearTimeout(refreshTimer)
      clearTimeout(expiryTimer)
      document.removeEventListener("visibilitychange", resume)
      window.removeEventListener("focus", resume)
      window.removeEventListener("online", resume)
    }
  }, [])

  const items = visibleAnnouncements(snapshot, dismissed)
  const current =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const index = current ? items.indexOf(current) : -1

  const dismiss = () => {
    if (!current || !snapshot?.dismissible) return
    const next = [...dismissed, dismissalKey(current)].slice(-100)
    setDismissed(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* In-memory dismissal still works. */
    }
  }

  return {
    current,
    index,
    count: items.length,
    mode: announcementMode(items.length),
    appearance: snapshot?.appearance ?? "dark",
    dismissible: snapshot?.dismissible ?? false,
    previous: () =>
      setSelectedId(adjacentAnnouncementId(items, current?.id ?? null, -1)),
    next: () =>
      setSelectedId(adjacentAnnouncementId(items, current?.id ?? null, 1)),
    dismiss,
  }
}
