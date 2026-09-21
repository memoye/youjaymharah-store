import { getImageProps } from "next/image"
import NextLink from "next/link"

import {
  getHeroContent,
  getHeroStill,
  type HeroSettings,
} from "@/lib/medusa/hero"
import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"
import { cn } from "@/lib/util/cn"

import { HeroVideo } from "./hero-video"

/** The widths the stills are served at; the crops come from the admin. */
const DESKTOP_SIZE = { width: 2400, height: 1200 }
const MOBILE_SIZE = { width: 1080, height: 1350 }

/** Tailwind's `md`, the width the media switches at. */
const DESKTOP_QUERY = "(min-width: 48rem)"

const headlineClass = "font-display text-display-xl text-balance"

const ctaClass =
  "inline-flex items-center justify-center px-10 py-4 text-[13px] font-medium tracking-[0.06em] uppercase transition-colors"

/**
 * The home page hero, filled in under Settings -> Storefront -> Homepage.
 * Renders nothing when staff switch it off or leave it empty, so the page
 * simply starts at the section below.
 */
export async function Hero() {
  const { homepage } = await getStorefrontSettings()
  const content = getHeroContent(homepage.hero)

  if (!content) {
    return null
  }

  if (!content.hasMedia) {
    return (
      <section className="border-b bg-muted px-5 py-32 text-center sm:px-6">
        <Copy content={content} />
      </section>
    )
  }

  return (
    <section className="relative isolate flex h-[82svh] min-h-128 items-center justify-center overflow-hidden px-5 py-20 text-center text-white sm:px-6">
      <HeroStill hero={homepage.hero} />
      <HeroVideo hero={homepage.hero} />

      <div
        aria-hidden
        className="absolute inset-0 -z-1 bg-linear-to-t from-black/65 via-black/20 to-black/25"
      />

      <Copy content={content} inverted />
    </section>
  )
}

/**
 * The still, art-directed: the browser picks the crop for its own width and
 * fetches only that one. `getImageProps` is what lets a `<picture>` keep
 * Next's optimisation.
 *
 * Eager with a high fetch priority rather than `preload`, which Next warns
 * against where the LCP element depends on the viewport: a preload link would
 * name one crop and phones would fetch both.
 */
function HeroStill({ hero }: { hero: HeroSettings }) {
  const desktop = getHeroStill(hero, "desktop")
  const mobile = getHeroStill(hero, "mobile")

  const common = { alt: "", sizes: "100vw", loading: "eager" as const }

  const desktopImage = desktop
    ? getImageProps({ ...common, src: desktop, ...DESKTOP_SIZE })
    : null

  const mobileImage = mobile
    ? getImageProps({ ...common, src: mobile, ...MOBILE_SIZE })
    : null

  const fallback = mobileImage ?? desktopImage

  if (!fallback) {
    return null
  }

  const { srcSet, ...rest } = fallback.props

  return (
    <picture>
      {desktopImage && mobileImage && (
        <source media={DESKTOP_QUERY} srcSet={desktopImage.props.srcSet} />
      )}
      <source srcSet={srcSet} />
      <img
        {...rest}
        alt=""
        fetchPriority="high"
        className="absolute inset-0 -z-2 size-full object-cover"
      />
    </picture>
  )
}

function Copy({
  content,
  inverted = false,
}: {
  content: NonNullable<ReturnType<typeof getHeroContent>>
  inverted?: boolean
}) {
  return (
    <div className="flex max-w-4xl flex-col items-center gap-6">
      {content.eyebrow && (
        <p
          className={cn(
            "text-[13px] font-medium tracking-[0.18em] uppercase",
            inverted ? "text-white/75" : "text-muted-foreground",
          )}
        >
          {content.eyebrow}
        </p>
      )}

      {content.title && <h1 className={headlineClass}>{content.title}</h1>}

      {content.description && (
        <p
          className={cn(
            "max-w-[46ch] text-intro text-pretty",
            inverted ? "text-white/85" : "text-muted-foreground",
          )}
        >
          {content.description}
        </p>
      )}

      {content.cta && (
        <NextLink
          href={content.cta.href}
          className={cn(
            ctaClass,
            "mt-2",
            inverted
              ? "border border-white/70 hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              : "bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
          )}
        >
          {content.cta.label}
        </NextLink>
      )}
    </div>
  )
}
