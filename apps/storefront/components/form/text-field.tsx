"use client"

import { useId, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/util/cn"

import { FieldError } from "./field-error"
import { useFieldContext } from "./form-context"

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "value" | "onChange" | "onBlur"
> & {
  label: string
  description?: string
}

/**
 * A labelled text input bound to its field. Ids come from `useId` rather than
 * the field name, so two forms with an `email` field can share a page.
 */
export function TextField({
  label,
  description,
  className,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const invalid = field.state.meta.errors.length > 0
  const describedBy = [
    description && `${id}-description`,
    invalid && `${id}-error`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <Input
        id={id}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {description && (
        <p
          id={`${id}-description`}
          className="text-[13px] text-muted-foreground"
        >
          {description}
        </p>
      )}
      <FieldError id={`${id}-error`} />
    </div>
  )
}
