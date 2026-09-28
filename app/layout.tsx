import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { headers } from "next/headers"
import { ClerkProvider } from "@clerk/nextjs"
import { clerkProviderPropsForHost } from "@/lib/clerk-runtime"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Graphai Jobs",
  description: "Jobs studio with country job counts, specialties, and certifications.",
}

export const viewport = {
  themeColor: "#084539",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host") || ""
  const proto = h.get("x-forwarded-proto") || "https"
  const clerk = clerkProviderPropsForHost(host, proto)
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-svh flex flex-col bg-bg text-foreground antialiased">
        <ClerkProvider dynamic {...clerk}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
