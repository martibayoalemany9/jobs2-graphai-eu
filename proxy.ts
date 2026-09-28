import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isGatedView = createRouteMatcher(["/onboarding"])
const isJobsPath = createRouteMatcher(["/jobs(.*)"])

function specialtiesFromClaims(claims: Record<string, unknown> | null | undefined): unknown {
  if (!claims) return null
  return claims.specialties
}

function hasSpecialties(raw: unknown): boolean {
  if (Array.isArray(raw) && raw.length > 0) return true
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t || t === "[]") return false
    try {
      const parsed = JSON.parse(t)
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      return t.split(",").filter(Boolean).length > 0
    }
  }
  return false
}

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith("/monitoring")) return NextResponse.next()

  const { userId, sessionClaims } = await auth()
  const view = url.searchParams.get("view") || "map"
  const needsOnboarding = Boolean(userId) && !hasSpecialties(specialtiesFromClaims(sessionClaims as Record<string, unknown>))
  const gated = view === "jobs" || view === "list" || view === "settings" || isJobsPath(req) || isGatedView(req)

  if (needsOnboarding && gated && url.pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
