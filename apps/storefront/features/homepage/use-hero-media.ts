"use client"

import { useSyncExternalStore } from "react"

import {
  getHeroMedia,
  type HeroMedia,
  type HeroSettings,
  type HeroViewport,
} from "@/lib/medusa/hero"

/** Tailwind's `md`, the width the header switches its navigation at. */
const DESKTOP_QUERY = "(min-width: 48rem)"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

const subscribers = new Map<string, (onChange: () => void) => () => void>()

const subscribeTo = (query: string) => {
  const existing = subscribers.get(query)

  if (existing) {
    return existing
  }

  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener("change", onChange)
    return () => list.removeEventListener("change", onChange)
  }

  subscribers.set(query, subscribe)

  return subscribe
}

/** Null until mounted: the server cannot know the viewport. */
function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => null,
  )
}

/**
 * The hero media this browser should play, once it is known.
 *
 * `media` is null through the server render and hydration, so the markup is
 * the same on both sides. Paint the still from `getHeroStill()` and layer the
 * video over it when this resolves -- deciding here rather than hiding one of
 * two `<video>` elements with CSS is what keeps the browser from fetching
 * both.
 */
export function useHeroMedia(hero: HeroSettings): {
  viewport: HeroViewport | null
  reducedMotion: boolean
  media: HeroMedia | null
} {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY) ?? false

  const viewport: HeroViewport | null =
    isDesktop === null ? null : isDesktop ? "desktop" : "mobile"

  return {
    viewport,
    reducedMotion,
    media: viewport
      ? getHeroMedia(hero, viewport, { stillOnly: reducedMotion })
      : null,
  }
}
