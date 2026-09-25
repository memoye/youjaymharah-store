"use client"

import { useEffect, useState } from "react"

/**
 * Keystrokes outrun the rate limit on `/store/search/*`, and a request per
 * letter would spend a shopper's budget before they finish the word.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
