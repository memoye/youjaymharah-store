import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Bodoni_Moda, Montserrat } from "next/font/google"

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-serif",
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: "--font-sans"
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <main
          className={`${bodoniModa.variable} ${montserrat.variable}`}
        // className={cn("relative")}
        >
          {props.children}
        </main>
      </body>
    </html>
  )
}
