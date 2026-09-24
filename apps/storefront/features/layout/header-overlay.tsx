"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/util/cn"

export type HeaderTone = "light" | "dark"

type HeaderOverlayValue = {
  tone: HeaderTone | null
  past: boolean
  height: number
  setTone: (tone: HeaderTone | null) => void
  setPast: (past: boolean) => void
  setHeight: (height: number) => void
}

const HeaderOverlayContext = createContext<HeaderOverlayValue | null>(null)

export function HeaderOverlayProvider({ children }: { children: ReactNode }) {
  const [tone, setTone] = useState<HeaderTone | null>(null)
  const [past, setPast] = useState(false)
  const [height, setHeight] = useState(0)

  const value = useMemo(
    () => ({ tone, past, height, setTone, setPast, setHeight }),
    [tone, past, height],
  )

  return (
    <HeaderOverlayContext.Provider value={value}>
      {children}
    </HeaderOverlayContext.Provider>
  )
}

function useHeaderOverlayContext() {
  const value = useContext(HeaderOverlayContext)

  if (!value) {
    throw new Error(
      "Header overlay needs <HeaderOverlayProvider> in app/(main)/layout.tsx",
    )
  }

  return value
}

/**
 * What the header should render as: a tone while it sits over the media, null
 * once the page has scrolled past it, which is the ordinary solid bar.
 */
export function useHeaderTone() {
  const { tone, past, setHeight } = useHeaderOverlayContext()

  return { tone: past ? null : tone, setHeight }
}

/**
 * Turns the header transparent for as long as its own section is under it.
 * Render it inside a `relative` full-bleed section, after the media so it
 * layers over it, and pass the tone the media needs: `light` for white
 * lettering over a dark image.
 *
 * The band it draws is what makes that lettering legible: the header can sit
 * anywhere over the image as the page scrolls, not only where a scrim happens
 * to be.
 */
export function HeaderOverlay({
  tone = "light",
  switchAt = 0.5,
}: {
  tone?: HeaderTone
  /** How far down the section the bar turns solid, as a fraction of it. */
  switchAt?: number
}) {
  const { setTone, setPast, height } = useHeaderOverlayContext()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTone(tone)

    return () => {
      setTone(null)
      setPast(false)
    }
  }, [tone, setTone, setPast])

  useEffect(() => {
    const sentinel = ref.current

    if (!sentinel) {
      return
    }

    // Watching a band of the section rather than the whole of it: the bar goes
    // solid once that band has passed above it, which is `switchAt` of the way
    // down. Reading it off the element keeps it right whatever the section's
    // height turns out to be.
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting),
      { rootMargin: `-${Math.round(height)}px 0px 0px 0px` },
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [height, setPast])

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: `${Math.min(Math.max(switchAt, 0), 1) * 100}%` }}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-40",
          tone === "light"
            ? "bg-linear-to-b from-scrim/45 via-scrim/15 to-transparent"
            : "bg-linear-to-b from-white/60 via-white/20 to-transparent",
        )}
      />
    </>
  )
}
