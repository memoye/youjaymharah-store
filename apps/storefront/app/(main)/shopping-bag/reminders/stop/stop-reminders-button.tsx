"use client"

import { Button } from "@/components/ui/button"
import { useStopCartReminders } from "@/features/cart-reminders/hooks"
import { isNotFound } from "@/lib/medusa/errors"

/**
 * Stops reminders only when clicked: email security scanners open links before
 * the shopper does, so the page itself must not stop anything.
 */
export function StopRemindersButton({ token }: { token: string }) {
  const stop = useStopCartReminders()

  if (stop.isSuccess) {
    return (
      <p role="status" className="text-[15px]">
        Done. You won&apos;t get any more bag reminders.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        size="lg"
        disabled={stop.isPending}
        onClick={() => stop.mutate(token)}
        className="px-5 tracking-[0.06em] uppercase"
      >
        {stop.isPending ? "Stopping…" : "Stop reminders"}
      </Button>
      {stop.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {isNotFound(stop.error)
            ? "This link is no longer valid."
            : "Something went wrong. Please try again."}
        </p>
      )}
    </div>
  )
}
