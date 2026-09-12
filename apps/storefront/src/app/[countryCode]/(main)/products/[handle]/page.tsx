import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"
import { getColourOption } from "@lib/util/swatch"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string; colour?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

/**
 * The gallery follows the selection: a chosen variant's own images, or, when
 * only a colour is chosen so far, the images of that colour's variants.
 * Falls back to every product image when nothing narrower is set up.
 */
function getImagesForSelection(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string,
  selectedColour?: string
) {
  const variants = product.variants ?? []

  const selectedVariant = selectedVariantId
    ? variants.find((v) => v.id === selectedVariantId)
    : undefined

  const colourOption = getColourOption(product)
  const candidates = selectedVariant?.images?.length
    ? [selectedVariant]
    : selectedColour && colourOption
    ? variants.filter((v) =>
        v.options?.some(
          (o) => o.option_id === colourOption.id && o.value === selectedColour
        )
      )
    : []

  const imageIds = new Set(
    candidates.flatMap((v) => v.images ?? []).map((i) => i.id)
  )
  if (!imageIds.size) {
    return product.images
  }

  return product.images?.filter((i) => imageIds.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForSelection(
    pricedProduct,
    selectedVariantId,
    searchParams.colour
  )

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
    />
  )
}
