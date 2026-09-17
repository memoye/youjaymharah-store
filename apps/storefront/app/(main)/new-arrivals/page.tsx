import type { Metadata } from "next"

import { ProductList } from "@/components/catalog/product-list"
import { listNewArrivals } from "@/lib/medusa/catalog"

// Stub: a working New arrivals page to replace with the designed one.

export const metadata: Metadata = {
  title: "New arrivals",
}

export default async function NewArrivalsPage() {
  const { products } = await listNewArrivals()

  return (
    <main className="container-wrapper px-5 py-10 sm:px-6">
      <h1 className="text-2xl font-medium tracking-[-0.01em]">New arrivals</h1>
      <div className="mt-8">
        <ProductList products={products} />
      </div>
    </main>
  )
}
