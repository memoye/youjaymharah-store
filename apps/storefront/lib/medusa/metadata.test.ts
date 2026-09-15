import { describe, expect, it } from "vitest"

import { metaImage, metaText } from "./metadata"

describe("metaText", () => {
  it("returns trimmed text", () => {
    expect(metaText("  Relaxed fit.  ")).toBe("Relaxed fit.")
  })

  it("treats cleared, blank and non-string values as not set", () => {
    expect(metaText("")).toBeNull()
    expect(metaText("   ")).toBeNull()
    expect(metaText(undefined)).toBeNull()
    expect(metaText(null)).toBeNull()
    expect(metaText(42)).toBeNull()
    expect(metaText({ text: "x" })).toBeNull()
  })
})

describe("metaImage", () => {
  it("accepts absolute http(s) addresses", () => {
    expect(metaImage("https://pub.r2.dev/a.jpg")).toBe(
      "https://pub.r2.dev/a.jpg",
    )
    expect(metaImage("http://localhost:9000/static/a.jpg")).toBe(
      "http://localhost:9000/static/a.jpg",
    )
  })

  it("rejects anything else", () => {
    expect(metaImage("")).toBeNull()
    expect(metaImage("a.jpg")).toBeNull()
    expect(metaImage("javascript:alert(1)")).toBeNull()
    expect(metaImage("//cdn.example.com/a.jpg")).toBeNull()
  })
})
