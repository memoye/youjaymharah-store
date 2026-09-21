import type { StorefrontSettings } from "./storefront-settings"

export type HeroSettings = StorefrontSettings["homepage"]["hero"]

export type HeroViewport = "desktop" | "mobile"

export type HeroMedia =
  | { kind: "video"; src: string; poster: string | null }
  | { kind: "image"; src: string }

export type HeroContent = {
  eyebrow: string | null
  title: string | null
  description: string | null
  cta: { label: string; href: string } | null
  desktop: HeroMedia | null
  mobile: HeroMedia | null
  hasMedia: boolean
}

/** Used when staff set a destination but no wording for the button. */
export const DEFAULT_CTA_LABEL = "Shop now"

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * The media to show at one breakpoint, or null when the hero has none.
 *
 * A breakpoint prefers its own media over the other's, so a desktop still
 * beats a phone video on a wide screen: the alternative is a portrait crop
 * stretched across a desk monitor. Within a breakpoint, video wins, and the
 * matching still becomes its poster.
 *
 * `stillOnly` (for `prefers-reduced-motion`) returns the poster instead of
 * the video where there is one. Where there is none, the video comes back
 * anyway -- an empty hero is worse -- so render it paused, without autoplay.
 */
export function getHeroMedia(
  hero: HeroSettings,
  viewport: HeroViewport,
  options: { stillOnly?: boolean } = {},
): HeroMedia | null {
  const ownVideo = clean(
    viewport === "desktop" ? hero.desktop_video_url : hero.mobile_video_url,
  )
  const ownImage = clean(
    viewport === "desktop" ? hero.desktop_image_url : hero.mobile_image_url,
  )
  const otherVideo = clean(
    viewport === "desktop" ? hero.mobile_video_url : hero.desktop_video_url,
  )
  const otherImage = clean(
    viewport === "desktop" ? hero.mobile_image_url : hero.desktop_image_url,
  )

  const poster = ownImage ?? otherImage

  if (options.stillOnly && poster) {
    return { kind: "image", src: poster }
  }

  if (ownVideo) {
    return { kind: "video", src: ownVideo, poster }
  }

  if (ownImage) {
    return { kind: "image", src: ownImage }
  }

  if (otherVideo) {
    return { kind: "video", src: otherVideo, poster: otherImage }
  }

  return otherImage ? { kind: "image", src: otherImage } : null
}

/**
 * Everything the hero renders, or null when there is nothing to show: it is
 * switched off, or staff turned it on and left it empty. Copy alone is enough
 * to render -- `hasMedia` says whether the section needs a media layer or can
 * stand as a typographic block.
 */
export function getHeroContent(hero: HeroSettings): HeroContent | null {
  if (!hero.enabled) {
    return null
  }

  const desktop = getHeroMedia(hero, "desktop")
  const mobile = getHeroMedia(hero, "mobile")
  const title = clean(hero.title)

  if (!desktop && !mobile && !title) {
    return null
  }

  const href = clean(hero.cta_url)

  return {
    eyebrow: clean(hero.eyebrow),
    title,
    description: clean(hero.description),
    cta: href
      ? { label: clean(hero.cta_label) ?? DEFAULT_CTA_LABEL, href }
      : null,
    desktop,
    mobile,
    hasMedia: Boolean(desktop ?? mobile),
  }
}

/**
 * The still to paint first at one breakpoint: the image, or a video's poster.
 * This is the hero's LCP element, so it is the one to mark `priority`.
 */
export function getHeroStill(
  hero: HeroSettings,
  viewport: HeroViewport,
): string | null {
  const media = getHeroMedia(hero, viewport)

  if (!media) {
    return null
  }

  return media.kind === "image" ? media.src : media.poster
}
