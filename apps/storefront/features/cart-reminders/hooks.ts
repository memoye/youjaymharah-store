"use client"

import { useMutation } from "@tanstack/react-query"
import type { StoreStopCartRemindersResponse } from "@youjaymharah/api-types"

import { getBrowserSdk } from "@/lib/medusa/browser"

/**
 * For the page the "Stop bag reminders" link opens
 * (`/shopping-bag/reminders/stop?token=...`). Call it from a button, not on
 * page load: email security scanners open links before the shopper does, and
 * would otherwise stop reminders nobody asked to stop.
 *
 * A 404 means the link is no longer valid; show that rather than an error.
 */
export function useStopCartReminders() {
  return useMutation({
    mutationFn: (token: string) =>
      getBrowserSdk().client.fetch<StoreStopCartRemindersResponse>(
        "/store/cart-reminders/stop",
        { method: "POST", body: { token } },
      ),
  })
}
