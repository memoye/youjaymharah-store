import { describe, expect, it } from "vitest"

import { getCategorySeo, getCategoryTrail, sortCategoryTree } from "./category"
import { getCollectionContent } from "./collection"

describe("getCategoryTrail", () => {
  it("lists ancestors from the top down", () => {
    const bags = {
      name: "Bags",
      handle: "bags",
      rank: 0,
      parent_category: {
        name: "Accessories",
        handle: "accessories",
        rank: 0,
        parent_category: {
          name: "Women",
          handle: "women",
          rank: 0,
          parent_category: null,
        },
      },
    }

    expect(getCategoryTrail(bags)).toEqual([
      { name: "Women", handle: "women" },
      { name: "Accessories", handle: "accessories" },
      { name: "Bags", handle: "bags" },
    ])
  })

  it("stops on a loop instead of hanging", () => {
    const a: {
      name: string
      handle: string
      rank: number
      parent_category?: unknown
    } = {
      name: "A",
      handle: "a",
      rank: 0,
    }
    a.parent_category = a
    expect(
      getCategoryTrail(a as Parameters<typeof getCategoryTrail>[0]),
    ).toEqual([{ name: "A", handle: "a" }])
  })
})

describe("sortCategoryTree", () => {
  it("orders every level by rank", () => {
    const sorted = sortCategoryTree([
      {
        name: "Men",
        handle: "men",
        rank: 1,
        category_children: [],
      },
      {
        name: "Women",
        handle: "women",
        rank: 0,
        category_children: [
          { name: "Shoes", handle: "shoes", rank: 2 },
          { name: "Dresses", handle: "dresses", rank: 0 },
        ],
      },
    ])

    expect(sorted.map((c) => c.handle)).toEqual(["women", "men"])
    expect(sorted[0].category_children?.map((c) => c.handle)).toEqual([
      "dresses",
      "shoes",
    ])
  })
})

describe("getCategorySeo", () => {
  it("prefers staff's Search & sharing text", () => {
    expect(
      getCategorySeo({
        name: "Dresses",
        description: "All dresses",
        metadata: {
          seo_title: "Dresses for every day",
          seo_description: "Shop dresses",
        },
      }),
    ).toEqual({ title: "Dresses for every day", description: "Shop dresses" })
  })

  it("falls back to the name and description when cleared", () => {
    expect(
      getCategorySeo({
        name: "Dresses",
        description: "All dresses",
        metadata: { seo_title: "", seo_description: "" },
      }),
    ).toEqual({ title: "Dresses", description: "All dresses" })
    expect(
      getCategorySeo({ name: "Dresses", description: "", metadata: null }),
    ).toEqual({ title: "Dresses", description: null })
  })
})

describe("getCollectionContent", () => {
  it("cleans the collection's metadata", () => {
    expect(
      getCollectionContent({
        id: "pcol_1",
        title: "New Arrivals",
        handle: "new-arrivals",
        metadata: {
          description: " Fresh in. ",
          hero_image: "https://pub.r2.dev/hero.jpg",
          hero_image_mobile: "",
        },
      }),
    ).toEqual({
      id: "pcol_1",
      title: "New Arrivals",
      handle: "new-arrivals",
      description: "Fresh in.",
      heroImage: "https://pub.r2.dev/hero.jpg",
      heroImageMobile: null,
    })
  })
})
