"use client"

import { Button } from "@/components/ui/button"
import { useConfirmNewsletter } from "@/features/newsletter/hooks"
import { isNotFound } from "@/lib/medusa/errors"

/**
 * Confirms only when clicked: email security scanners open links before the
 * shopper does, and a page that confirmed on load would sign people up on the
 * scanner's say-so -- the thing double opt-in exists to prevent.
 */
export function ConfirmSubscriptionButton({ token }: { token: string }) {
  const confirm = useConfirmNewsletter()

  if (confirm.isSuccess) {
    return (
      <p role="status" className="text-[15px]">
        You&apos;re subscribed. Welcome to The YJ Edit.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        size="lg"
        disabled={confirm.isPending}
        onClick={() => confirm.mutate(token)}
        className="px-5 tracking-[0.06em] uppercase"
      >
        {confirm.isPending ? "Confirming…" : "Confirm subscription"}
      </Button>
      {confirm.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {isNotFound(confirm.error)
            ? "This link is no longer valid. Sign up again from the footer of any page."
            : "Something went wrong. Please try again."}
        </p>
      )}
    </div>
  )
}
