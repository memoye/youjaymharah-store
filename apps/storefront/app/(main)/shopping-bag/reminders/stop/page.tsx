import type { Metadata } from "next"

import { StopRemindersButton } from "./stop-reminders-button"

// Stub: the page the "Stop bag reminders" email link opens. Replace with the
// designed page.

export const metadata: Metadata = {
  title: "Bag reminders",
  robots: { index: false },
}

export default async function StopCartRemindersPage({
  searchParams,
}: PageProps<"/shopping-bag/reminders/stop">) {
  const { token } = await searchParams

  return (
    <main className="container-wrapper max-w-xl px-5 py-16 sm:px-6">
      <h1 className="text-2xl font-medium tracking-[-0.01em]">
        Stop bag reminders
      </h1>
      {typeof token === "string" && token ? (
        <>
          <p className="mt-3 text-[15px] text-muted-foreground">
            We won&apos;t email this address about items left in its shopping
            bag again.
          </p>
          <div className="mt-6">
            <StopRemindersButton token={token} />
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
