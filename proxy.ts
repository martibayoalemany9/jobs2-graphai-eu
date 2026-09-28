import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { canonicalHtmlHost, clerkProviderPropsForHost, clerkSatelliteForHost } from "@/lib/clerk-runtime"

export default clerkMiddleware(async (_auth, req) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith("/monitoring")) return NextResponse.next()
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || ""
  const canon = canonicalHtmlHost(host)
  const accept = req.headers.get("accept") || ""
  if (canon && req.method === "GET" && accept.includes("text/html") && !url.pathname.startsWith("/api") && !url.pathname.startsWith("/__clerk")) {
    const next = new URL(req.url)
    next.hostname = canon
    next.protocol = "https:"
    next.port = ""
    return NextResponse.redirect(next, 308)
  }
  return NextResponse.next()
}, (req) => {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || ""
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const clerk = clerkProviderPropsForHost(host, proto)
  return {
    ...clerk,
    frontendApiProxy: { enabled: clerkSatelliteForHost(host) },
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
