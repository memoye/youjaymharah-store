"use client"

import { useId } from "react"

import {
  FieldError,
  useAppForm,
  validateOnSubmitThenChange,
} from "@/components/form"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  useNewsletterSettings,
  useSubscribeToNewsletter,
} from "@/features/newsletter/hooks"
import { newsletterSignupSchema } from "@/features/newsletter/schema"
import { errorStatus } from "@/lib/medusa/errors"
import { cn } from "@/lib/util/cn"

const DEFAULT_SUCCESS = "Thanks. Check your inbox to confirm."

function signupError(error: unknown): string {
  switch (errorStatus(error)) {
    case 429:
      return "Too many attempts from this connection. Please wait a minute and try again."
    case 400:
      return "We couldn't sign up that address. Check it and try again."
    default:
      return "We couldn't sign you up just now. Please try again."
  }
}

/**
 * Newsletter signup, rendered only while signup is switched on in the admin.
 *
 * The consent wording is the admin's, shown verbatim: the backend records it
 * on the subscriber as what they agreed to, so it has to be what they saw.
 */
export function NewsletterSignup({
  source,
  className,
}: {
  /** Recorded on the subscriber, e.g. "footer". */
  source: string
  className?: string
}) {
  const settings = useNewsletterSettings()
  const subscribe = useSubscribeToNewsletter(source)
  const headingId = useId()
  const inputId = useId()
  const consentId = useId()
  const errorId = useId()
  const serverErrorId = useId()

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: validateOnSubmitThenChange(),
    validators: { onDynamic: newsletterSignupSchema },
    onSubmit: async ({ value }) => {
      try {
        await subscribe.mutateAsync(value.email.trim())
      } catch {
        // Shown from the mutation's own error state below the field.
      }
    },
  })

  if (!settings.data?.enabled) {
    return null
  }

  const consent = settings.data.consent_text

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="font-display text-2xl">
          The YJ Edit
        </h2>
        <p className="max-w-[46ch] text-sm text-pretty text-muted-foreground">
          New collections, considered pieces and invitations to discover
          what&apos;s next.
        </p>
      </div>

      {subscribe.isSuccess ? (
        <p
          role="status"
          tabIndex={-1}
          // The form, and the focus inside it, has just gone; land the reader
          // on the outcome instead of the top of the page.
          ref={(node) => node?.focus()}
          className="text-sm outline-none"
        >
          {subscribe.data.message ?? DEFAULT_SUCCESS}
        </p>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-2"
        >
          <form.AppField
            name="email"
            listeners={{
              // A new attempt makes the last server error stale.
              onChange: () => {
                if (subscribe.isError) subscribe.reset()
              },
            }}
          >
            {(field) => {
              const invalid = field.state.meta.errors.length > 0
              const describedBy = [
                invalid && errorId,
                subscribe.isError && serverErrorId,
                consent && consentId,
              ]
                .filter(Boolean)
                .join(" ")

              return (
                <>
                  <label htmlFor={inputId} className="text-[13px] font-medium">
                    Email address
                  </label>

                  <InputGroup className="h-12">
                    <InputGroupInput
                      id={inputId}
                      name={field.name}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={invalid || undefined}
                      aria-describedby={describedBy || undefined}
                      className="h-full px-4 text-sm"
                    />
                    <InputGroupAddon align="inline-end">
                      <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(isSubmitting) => (
                          <InputGroupButton
                            type="submit"
                            size="sm"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting || undefined}
                            className="px-4 text-[13px] font-medium tracking-[0.06em] uppercase"
                          >
                            {isSubmitting ? "Signing up…" : "Sign up"}
                          </InputGroupButton>
                        )}
                      </form.Subscribe>
                    </InputGroupAddon>
                  </InputGroup>

                  <FieldError id={errorId} />
                </>
              )
            }}
          </form.AppField>

          {subscribe.isError && (
            <p
              id={serverErrorId}
              role="alert"
              className="text-[13px] text-destructive"
            >
              {signupError(subscribe.error)}
            </p>
          )}

          {consent && (
            <p
              id={consentId}
              className="text-xs text-pretty text-muted-foreground"
            >
              {consent}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
