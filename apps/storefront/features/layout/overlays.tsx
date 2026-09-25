"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

/** The header panels that take the screen over when they open. */
export type OverlayId = "search" | "menu" | "mobile-nav"

type OverlaysValue = {
  current: OverlayId | null
  setCurrent: Dispatch<SetStateAction<OverlayId | null>>
}

const OverlaysContext = createContext<OverlaysValue | null>(null)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<OverlayId | null>(null)
  const value = useMemo(() => ({ current, setCurrent }), [current])

  return (
    <OverlaysContext.Provider value={value}>
      {children}
    </OverlaysContext.Provider>
  )
}

/**
 * One slot for the whole header, so opening search closes whichever menu was
 * open and the other way round, instead of leaving two panels stacked with one
 * scrim darkening the other.
 */
export function useOverlay(id: OverlayId) {
  const context = useContext(OverlaysContext)

  if (!context) {
    throw new Error("useOverlay() needs <OverlayProvider> around the header")
  }

  const { current, setCurrent } = context

  // Closing clears the slot only while it is still ours: a panel that has
  // already handed over must not close the one that replaced it.
  const setOpen = useCallback(
    (next: boolean) =>
      setCurrent((previous) => (next ? id : previous === id ? null : previous)),
    [id, setCurrent],
  )

  const toggle = useCallback(
    () => setCurrent((previous) => (previous === id ? null : id)),
    [id, setCurrent],
  )

  return { open: current === id, setOpen, toggle }
}
