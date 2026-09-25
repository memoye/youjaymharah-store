"use client"

import { useFieldContext } from "./form-context"

/**
 * The field's first validation error. Schema validators report issue objects
 * rather than strings, so both shapes are read.
 *
 * Pass the same `id` the control lists in `aria-describedby`, so a screen
 * reader announces the error with the field.
 */
export function FieldError({ id }: { id: string }) {
  const field = useFieldContext<unknown>()
  const [error] = field.state.meta.errors
  const message =
    typeof error === "string"
      ? error
      : (error as { message?: string } | undefined)?.message

  if (!message) {
    return null
  }

  return (
    <p id={id} className="text-[13px] text-destructive">
      {message}
    </p>
  )
}
