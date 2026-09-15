import type { NextConfig } from "next"

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number]

function imageRemotePatterns(value: string | undefined): RemotePattern[] {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  return entries.map((entry) => {
    let url: URL

    try {
      url = new URL(entry)
    } catch {
      throw new Error(
        `IMAGE_REMOTE_URLS: "${entry}" is not a full URL. Use addresses like https://pub-<hash>.r2.dev,
 separated by commas.`,
      )
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(
        `IMAGE_REMOTE_URLS: "${entry}" must start with https:// (or http:// for local development).`,
      )
    }

    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/**`,
    }
  })
}

const remotePatterns = imageRemotePatterns(process.env.IMAGE_REMOTE_URLS)

if (!remotePatterns.length) {
  console.warn(
    "IMAGE_REMOTE_URLS is not set, so next/image will refuse product photos and uploaded logos. See .env.template.",
  )
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
}

export default nextConfig
