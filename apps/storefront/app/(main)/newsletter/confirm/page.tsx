import type { Metadata } from "next"

import { ConfirmSubscriptionButton } from "./confirm-subscription-button"

// Stub: the page the confirmation email links to. Replace with the designed
// page.

export const metadata: Metadata = {
  title: "Confirm your subscription",
  robots: { index: false },
}

export default async function ConfirmNewsletterPage({
  searchParams,
}: PageProps<"/newsletter/confirm">) {
  const { token } = await searchParams

  return (
    <main className="container-wrapper max-w-xl px-5 py-16 sm:px-6">
      <h1 className="text-2xl font-medium tracking-[-0.01em]">
        Confirm your subscription
      </h1>
      {typeof token === "string" && token ? (
        <>
          <p className="mt-3 text-[15px] text-muted-foreground">
            One more step: confirm this address to start receiving The YJ Edit.
          </p>
          <div className="mt-6">
            <ConfirmSubscriptionButton token={token} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-muted-foreground">
          This link isn&apos;t complete. Open it again from the email.
        </p>
      )}
    </main>
  )
}
