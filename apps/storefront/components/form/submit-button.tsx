"use client"

import type { ComponentProps, ReactNode } from "react"

import { Button } from "@/components/ui/button"

import { useFormContext } from "./form-context"

/**
 * Disabled while the form submits, so a double click can't send it twice.
 * Left enabled when the form is invalid: pressing it is how a shopper finds
 * out what's wrong.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingLabel?: ReactNode }) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          {...props}
        >
          {isSubmitting && pendingLabel ? pendingLabel : children}
        </Button>
      )}
    </form.Subscribe>
  )
}
