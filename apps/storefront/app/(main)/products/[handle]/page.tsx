import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

import { getProductByHandle } from "@/lib/medusa/catalog"
import { formatPrice, getProductPrice } from "@/lib/medusa/price"
import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"
import { getColourChoices, getSizeChoices } from "@/lib/medusa/variants"
import { buildProductMetadata } from "@/lib/seo/metadata"

// Stub: enough of a product page for menu and listing links to land on.
// Replace with the designed page (gallery, selection, add to bag).

export async function generateMetadata({
  params,
}: PageProps<"/products/[handle]">): Promise<Metadata> {
  const product = await getProductByHandle((await params).handle)

  if (!product) {
    return {}
  }

  return buildProductMetadata(product, await getStorefrontSettings())
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[handle]">) {
  const product = await getProductByHandle((await params).handle)

  if (!product) {
    notFound()
  }

  const price = getProductPrice(product)
  const colours = getColourChoices(product)
  const sizes = getSizeChoices(product)

  return (
    <main className="container-wrapper grid gap-10 px-5 py-10 sm:px-6 md:grid-cols-2">
      <div className="relative aspect-3/4 bg-muted">
        {product.thumbnail && (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      <div>
        <h1 className="text-2xl font-medium tracking-[-0.01em]">
          {product.title}
        </h1>
        {price && (
          <p className="mt-2 text-[15px] tabular-nums">
            {price.isRange && "From "}
            {formatPrice(price.price.amount, price.price.currencyCode)}
          </p>
        )}

        {colours.length > 0 && (
          <p className="mt-6 text-[13px]">
            <span className="font-medium">Colour: </span>
            {colours.map((choice) => choice.value).join(", ")}
          </p>
        )}
        {sizes.length > 0 && (
          <p className="mt-2 text-[13px]">
            <span className="font-medium">Sizes: </span>
            {sizes
              .map((choice) =>
                choice.available ? choice.value : `${choice.value} (sold out)`,
              )
              .join(", ")}
          </p>
        )}

        {product.description && (
          <p className="mt-6 max-w-[65ch] text-[15px] leading-7">
            {product.description}
          </p>
        )}
      </div>
    </main>
  )
}
