import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const keyed = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-svh flex flex-col bg-bg text-foreground antialiased">
        {keyed ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  )
}
