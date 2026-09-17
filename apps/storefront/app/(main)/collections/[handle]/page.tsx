import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

import { ProductList } from "@/components/catalog/product-list"
import { getCollectionByHandle, listProducts } from "@/lib/medusa/catalog"
import { getCollectionContent } from "@/lib/medusa/collection"

// Stub: a working collection page to replace with the designed one.

export async function generateMetadata({
  params,
}: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const collection = await getCollectionByHandle((await params).handle)

  if (!collection) {
    return {}
  }

  const content = getCollectionContent(collection)

  return {
    title: content.title,
    description: content.description ?? undefined,
  }
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[handle]">) {
  const collection = await getCollectionByHandle((await params).handle)

  if (!collection) {
    notFound()
  }

  const content = getCollectionContent(collection)
  const { products } = await listProducts({ collectionId: collection.id })
  const mobileBanner = content.heroImageMobile ?? content.heroImage

  return (
    <main>
      {content.heroImage && (
        <div className="relative hidden aspect-2/1 max-h-[70vh] w-full bg-muted md:block">
          <Image
            src={content.heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      {mobileBanner && (
        <div className="relative aspect-4/5 w-full bg-muted md:hidden">
          <Image
            src={mobileBanner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="container-wrapper px-5 py-10 sm:px-6">
        <h1 className="font-display text-display-md">{content.title}</h1>
        {content.description && (
          <p className="mt-4 max-w-[65ch] text-intro text-muted-foreground">
            {content.description}
          </p>
        )}
        <div className="mt-10">
          <ProductList products={products} />
        </div>
      </div>
    </main>
  )
}
