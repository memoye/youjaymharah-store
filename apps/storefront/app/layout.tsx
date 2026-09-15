import type { Metadata } from "next"
import { Bodoni_Moda, Montserrat } from "next/font/google"

import "./globals.css"
import { JsonLd } from "@/components/seo/json-ld"
import { getStorefrontSettings } from "@/lib/medusa/storefront-settings"
import { QueryProvider } from "@/lib/query/provider"
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld"
import { buildRootMetadata } from "@/lib/seo/metadata"
import { cn } from "@/lib/util/cn"
import { StorefrontSettingsProvider } from "@/features/site-settings/provider"

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
})

const bodoniModa = Bodoni_Moda({
  variable: "--font-serif",
  subsets: ["latin"],
})

/**
 * Site-wide title template, description, favicon, link previews, indexing and
 * Search Console verification, all from Settings › Storefront in the admin.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata(await getStorefrontSettings())
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getStorefrontSettings()

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        montserrat.variable,
        bodoniModa.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={[organizationJsonLd(settings), websiteJsonLd(settings)]}
        />
        <StorefrontSettingsProvider settings={settings}>
          <QueryProvider>{children}</QueryProvider>
        </StorefrontSettingsProvider>
      </body>
    </html>
  )
}
