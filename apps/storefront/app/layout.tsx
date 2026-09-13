import type { Metadata } from "next";
import { Bodoni_Moda, Montserrat } from "next/font/google";

import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { cn } from "@/lib/utils";

const bodoniModa = Bodoni_Moda({
  variable: "--font-serif",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouJaymharah Trends",
  description: "Fashion store",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
