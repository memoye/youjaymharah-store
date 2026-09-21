import { describe, expect, it } from "vitest"

import {
  DEFAULT_CTA_LABEL,
  getHeroContent,
  getHeroMedia,
  getHeroStill,
  type HeroSettings,
} from "./hero"

const hero = (overrides: Partial<HeroSettings> = {}): HeroSettings => ({
  enabled: true,
  eyebrow: null,
  title: null,
  description: null,
  desktop_image_url: null,
  mobile_image_url: null,
  desktop_video_url: null,
  mobile_video_url: null,
  cta_label: null,
  cta_url: null,
  ...overrides,
})

describe("getHeroMedia", () => {
  it("prefers video over the still at the same breakpoint", () => {
    const settings = hero({
      desktop_video_url: "wide.mp4",
      desktop_image_url: "wide.jpg",
    })

    expect(getHeroMedia(settings, "desktop")).toEqual({
      kind: "video",
      src: "wide.mp4",
      poster: "wide.jpg",
    })
  })

  it("prefers its own still over the other breakpoint's video", () => {
    const settings = hero({
      desktop_image_url: "wide.jpg",
      mobile_video_url: "tall.mp4",
    })

    expect(getHeroMedia(settings, "desktop")).toEqual({
      kind: "image",
      src: "wide.jpg",
    })
  })

  it("falls back across breakpoints when one has nothing", () => {
    const settings = hero({ desktop_image_url: "wide.jpg" })

    expect(getHeroMedia(settings, "mobile")).toEqual({
      kind: "image",
      src: "wide.jpg",
    })
  })

  it("posters a video with the still of its own breakpoint", () => {
    const settings = hero({
      mobile_video_url: "tall.mp4",
      mobile_image_url: "tall.jpg",
      desktop_image_url: "wide.jpg",
    })

    expect(getHeroMedia(settings, "mobile")).toEqual({
      kind: "video",
      src: "tall.mp4",
      poster: "tall.jpg",
    })
  })

  it("returns the poster instead of the video when stills are asked for", () => {
    const settings = hero({
      desktop_video_url: "wide.mp4",
      desktop_image_url: "wide.jpg",
    })

    expect(getHeroMedia(settings, "desktop", { stillOnly: true })).toEqual({
      kind: "image",
      src: "wide.jpg",
    })
  })

  it("keeps the video when reduced motion has no still to fall back on", () => {
    const settings = hero({ desktop_video_url: "wide.mp4" })

    expect(getHeroMedia(settings, "desktop", { stillOnly: true })).toEqual({
      kind: "video",
      src: "wide.mp4",
      poster: null,
    })
  })

  it("treats blank strings as missing", () => {
    const settings = hero({ desktop_image_url: "   ", mobile_image_url: "" })

    expect(getHeroMedia(settings, "desktop")).toBeNull()
  })
})

describe("getHeroContent", () => {
  it("is null when the hero is switched off", () => {
    expect(getHeroContent(hero({ enabled: false, title: "Hi" }))).toBeNull()
  })

  it("is null when it is on but empty", () => {
    expect(getHeroContent(hero())).toBeNull()
  })

  it("renders on copy alone, with no media layer", () => {
    const content = getHeroContent(
      hero({ title: "Designed to be remembered." }),
    )

    expect(content).toMatchObject({
      title: "Designed to be remembered.",
      hasMedia: false,
      desktop: null,
      mobile: null,
    })
  })

  it("labels a destination staff left unlabelled", () => {
    const content = getHeroContent(
      hero({ title: "Autumn", cta_url: "/collections/autumn" }),
    )

    expect(content?.cta).toEqual({
      label: DEFAULT_CTA_LABEL,
      href: "/collections/autumn",
    })
  })

  it("drops a label with no destination", () => {
    const content = getHeroContent(hero({ title: "Autumn", cta_label: "Shop" }))

    expect(content?.cta).toBeNull()
  })

  it("trims the copy", () => {
    const content = getHeroContent(
      hero({ eyebrow: "  AUTUMN  ", title: " Coats ", description: "  " }),
    )

    expect(content).toMatchObject({
      eyebrow: "AUTUMN",
      title: "Coats",
      description: null,
    })
  })
})

describe("getHeroStill", () => {
  it("gives a video's poster", () => {
    const settings = hero({
      desktop_video_url: "wide.mp4",
      desktop_image_url: "wide.jpg",
    })

    expect(getHeroStill(settings, "desktop")).toBe("wide.jpg")
  })

  it("is null for a video with no poster", () => {
    expect(
      getHeroStill(hero({ desktop_video_url: "wide.mp4" }), "desktop"),
    ).toBeNull()
  })
})
