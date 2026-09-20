"use client"

import Link from "next/link"
import { useAnnouncements } from "@/features/announcements/use-announcements"

/** Intentionally minimal presentation; fetching and selection live in the hook. */
export function AnnouncementBanner() {
  const banner = useAnnouncements()
  if (!banner.current) return null
  const item = banner.current
  const controlClass =
    "min-h-10 min-w-10 rounded px-2 focus-visible:outline-2 focus-visible:outline-offset-2"

  return (
    <section
      aria-label="Store announcements"
      data-mode={banner.mode}
      className={`flex w-full items-center justify-center gap-2 px-3 py-2 text-sm ${banner.appearance === "dark" ? "bg-black text-white" : "bg-stone-100 text-stone-950"}`}
    >
      {banner.mode === "carousel" && (
        <button
          type="button"
          className={controlClass}
          onClick={banner.previous}
          aria-label="Previous announcement"
        >
          ←
        </button>
      )}
      <div
        className="min-w-0 text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="wrap-break-word">{item.message}</span>
        {item.promotion_code && (
          <span className="ml-2">
            Code: <strong>{item.promotion_code}</strong>
          </span>
        )}
        {item.href && item.link_label && (
          <Link
            href={item.href}
            className="ml-2 inline-block py-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {item.link_label}
          </Link>
        )}
        {banner.mode === "carousel" && (
          <span className="ml-2 text-xs">
            {banner.index + 1} / {banner.count}
          </span>
        )}
      </div>
      {banner.mode === "carousel" && (
        <button
          type="button"
          className={controlClass}
          onClick={banner.next}
          aria-label="Next announcement"
        >
          →
        </button>
      )}
      {banner.dismissible && (
        <button
          type="button"
          className={controlClass}
          onClick={banner.dismiss}
          aria-label="Dismiss this announcement"
        >
          ×
        </button>
      )}
    </section>
  )
}
