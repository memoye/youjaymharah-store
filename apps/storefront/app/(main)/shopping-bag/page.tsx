import type { Metadata } from "next"

import { CartContents } from "./cart-contents"

// Stub: shows the cart and explains a failed restore link. Replace with the
// designed page.

export const metadata: Metadata = {
  title: "Shopping bag",
  robots: { index: false },
}

const RESTORE_MESSAGES: Record<string, string> = {
  expired:
    "That link has expired. Your bag may already have been checked out or cleared.",
  invalid: "That link isn't complete. Try opening it from the email again.",
  failed:
    "We couldn't bring your bag back just now. Please try the link again in a moment.",
}

export default async function CartPage({
  searchParams,
}: PageProps<"/shopping-bag">) {
  const { restore } = await searchParams
  const message =
    typeof restore === "string" ? RESTORE_MESSAGES[restore] : undefined

  return (
    <main className="container-wrapper px-5 py-10 sm:px-6">
      <h1 className="text-2xl font-medium tracking-[-0.01em]">Shopping bag</h1>

      {message && (
        <p
          role="status"
          className="mt-4 border-l-2 border-gold pl-3 text-[15px]"
        >
          {message}
        </p>
      )}

      <div className="mt-8">
        <CartContents />
      </div>
    </main>
  )
}
