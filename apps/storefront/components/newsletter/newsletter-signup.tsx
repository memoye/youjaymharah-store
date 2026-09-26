"use client"

import { ArrowRightIcon } from "@phosphor-icons/react"
import { useId, useState } from "react"

import {
  FieldError,
  useAppForm,
  validateOnSubmitThenChange,
} from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useNewsletterSettings,
  useSubscribeToNewsletter,
} from "@/features/newsletter/hooks"
import { newsletterSignupSchema } from "@/features/newsletter/schema"
import { errorStatus } from "@/lib/medusa/errors"
import { cn } from "@/lib/util/cn"

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
 * All of its copy is the admin's (Settings -> Newsletter); the backend fills
 * in defaults, so nothing here is hardcoded. The consent wording is shown
 * verbatim: it is recorded on the subscriber as what they agreed to.
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
  // Kept apart from `open` so the dialog's text doesn't change while it fades out.
  const [sentTo, setSentTo] = useState("")
  const [confirming, setConfirming] = useState(false)
  const headingId = useId()
  const inputId = useId()
  const consentId = useId()
  const errorId = useId()
  const serverErrorId = useId()

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: validateOnSubmitThenChange(),
    validators: { onDynamic: newsletterSignupSchema },
    onSubmit: async ({ value, formApi }) => {
      const email = value.email.trim()

      try {
        await subscribe.mutateAsync(email)
        setSentTo(email)
        setConfirming(true)
        formApi.reset()
      } catch {
        // Shown from the mutation's own error state below the field.
      }
    },
  })

  if (!settings.data?.enabled) {
    return null
  }

  const {
    heading,
    description,
    consent_text: consent,
    double_opt_in: needsConfirmation,
  } = settings.data

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-16 gap-y-8",
        className,
      )}
    >
      <div className="flex max-w-md grow basis-72 flex-col gap-3">
        <h2 id={headingId} className="font-display text-3xl">
          {heading}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
        className="flex max-w-md grow basis-72 flex-col gap-3"
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
                <label
                  htmlFor={inputId}
                  className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase"
                >
                  Email address
                </label>

                {/*
                  One rule under the input and the button together: at rest it
                  recedes into the footer; focus draws it in full and thickens
                  it, without shifting anything below.
                */}
                <div className="flex items-center gap-4 border-b border-foreground/25 transition-[border-color,box-shadow] duration-200 focus-within:border-foreground focus-within:shadow-[0_1px_0_0_var(--foreground)] has-aria-invalid:border-destructive has-aria-invalid:shadow-none">
                  <input
                    id={inputId}
                    name={field.name}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy || undefined}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />

                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting || undefined}
                        className="group inline-flex h-11 shrink-0 items-center gap-2 text-[13px] font-medium tracking-[0.06em] uppercase underline-offset-4 outline-none focus-visible:underline disabled:opacity-50"
                      >
                        {isSubmitting ? "Subscribing…" : "Subscribe"}
                        <ArrowRightIcon
                          aria-hidden
                          className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </button>
                    )}
                  </form.Subscribe>
                </div>

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

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {needsConfirmation ? "Check your inbox" : "You're subscribed"}
            </DialogTitle>
            <DialogDescription>
              {needsConfirmation ? (
                <>
                  We&apos;ve sent a confirmation link to{" "}
                  <span className="text-foreground">{sentTo}</span>. Open it to
                  confirm your subscription. If it hasn&apos;t arrived in a few
                  minutes, check your spam or promotions folder.
                </>
              ) : (
                <>
                  New collections and invitations will now arrive at{" "}
                  <span className="text-foreground">{sentTo}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  size="lg"
                  className="px-6 text-[13px] tracking-[0.06em] uppercase"
                />
              }
            >
              Got it
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
