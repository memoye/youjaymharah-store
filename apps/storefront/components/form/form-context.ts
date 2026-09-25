import { createFormHookContexts } from "@tanstack/react-form"

/**
 * Lets field and form components read their own TanStack state from context,
 * so `<field.TextField label="Email" />` needs no props for value, handlers or
 * errors.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
