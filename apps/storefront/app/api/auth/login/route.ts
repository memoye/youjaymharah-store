import { crossOriginRefused, isSameOrigin } from "@/lib/http/same-origin"
import {
  authFailure,
  completeSignIn,
  extraStepRequired,
} from "@/lib/medusa/auth"
import { sdk } from "@/lib/medusa/server"

/** Email and password sign-in. The token goes into an httpOnly cookie only. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return crossOriginRefused()
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    password?: unknown
  } | null

  if (typeof body?.email !== "string" || typeof body.password !== "string") {
    return Response.json(
      { message: "Email and password are required." },
      { status: 400 },
    )
  }

  try {
    const result = await sdk.auth.login("customer", "emailpass", {
      email: body.email,
      password: body.password,
    })

    if (typeof result !== "string") {
      return extraStepRequired()
    }

    await completeSignIn(result)

    return Response.json({ success: true })
  } catch (error) {
    return authFailure(error, "Could not sign in. Please try again.")
  }
}
