"use client"

import { useState } from "react"

import { useHeroMedia } from "@/features/homepage/use-hero-media"
import type { HeroSettings } from "@/lib/medusa/hero"
import { cn } from "@/lib/util/cn"

/**
 * Plays over the still once the browser has decided which file it wants and
 * has enough of it to run. Renders nothing for a still-only hero, or when the
 * visitor asked for reduced motion.
 */
export function HeroVideo({ hero }: { hero: HeroSettings }) {
  const { media } = useHeroMedia(hero)
  const [playing, setPlaying] = useState(false)

  if (media?.kind !== "video") {
    return null
  }

  return (
    <video
      key={media.src}
      src={media.src}
      poster={media.poster ?? undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-out",
        playing ? "opacity-100" : "opacity-0",
      )}
    />
  )
}
