import { describe, expect, it } from "vitest"

import { newsletterSignupSchema } from "./schema"

const errorFor = (email: string) =>
  newsletterSignupSchema.safeParse({ email }).error?.issues[0]?.message

describe("newsletterSignupSchema", () => {
  it("asks for an address when the field is empty or only spaces", () => {
    expect(errorFor("")).toBe("Enter your email address.")
    expect(errorFor("   ")).toBe("Enter your email address.")
  })

  it("explains what a valid address looks like", () => {
    expect(errorFor("name@")).toBe(
      "Enter a valid email address, like name@example.com.",
    )
    expect(errorFor("not an email")).toBe(
      "Enter a valid email address, like name@example.com.",
    )
  })

  it("accepts a pasted address with stray whitespace", () => {
    const result = newsletterSignupSchema.safeParse({
      email: "  ada@example.com ",
    })

    expect(result.success).toBe(true)
    expect(result.data?.email).toBe("ada@example.com")
  })
})
