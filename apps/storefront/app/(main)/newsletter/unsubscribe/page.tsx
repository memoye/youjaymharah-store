import type { Metadata } from "next"

import { UnsubscribeButton } from "./unsubscribe-button"

// Stub: the page the unsubscribe link in every newsletter email opens. Replace
// with the designed page.

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
}

export default async function UnsubscribeNewsletterPage({
  searchParams,
}: PageProps<"/newsletter/unsubscribe">) {
  const { token } = await searchParams

  return (
    <main className="container-wrapper max-w-xl px-5 py-16 sm:px-6">
      <h1 className="text-2xl font-medium tracking-[-0.01em]">
        Unsubscribe from The YJ Edit
      </h1>
      {typeof token === "string" && token ? (
        <>
          <p className="mt-3 text-[15px] text-muted-foreground">
            We&apos;ll stop sending newsletters to this address. Order and
            account emails aren&apos;t affected.
          </p>
          <div className="mt-6">
            <UnsubscribeButton token={token} />
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
