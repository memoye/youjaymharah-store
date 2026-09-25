"use client"

import { Button } from "@/components/ui/button"
import { useUnsubscribeFromNewsletter } from "@/features/newsletter/hooks"
import { isNotFound } from "@/lib/medusa/errors"

/**
 * Unsubscribes only when clicked: email security scanners open every link in
 * a message, and a page that acted on load would unsubscribe readers who
 * never asked to leave.
 */
export function UnsubscribeButton({ token }: { token: string }) {
  const unsubscribe = useUnsubscribeFromNewsletter()

  if (unsubscribe.isSuccess) {
    return (
      <p role="status" className="text-[15px]">
        Done. You won&apos;t receive The YJ Edit any more.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        size="lg"
        disabled={unsubscribe.isPending}
        onClick={() => unsubscribe.mutate(token)}
        className="px-5 tracking-[0.06em] uppercase"
      >
        {unsubscribe.isPending ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
      {unsubscribe.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {isNotFound(unsubscribe.error)
            ? "This link is no longer valid."
            : "Something went wrong. Please try again."}
        </p>
      )}
    </div>
  )
}
