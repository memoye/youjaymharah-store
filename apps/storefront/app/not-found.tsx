import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm">The page you tried to access does not exist.</p>
      <Link href="/">Continue shopping</Link>
    </div>
  )
}
