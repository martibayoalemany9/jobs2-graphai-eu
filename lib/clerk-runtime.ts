/** Host rules for the shared Graphai production Clerk instance (clerk.graphai.eu). */

export const PRIMARY_SIGN_IN = "https://jobs.graphai.eu/sign-in.html"
export const PRIMARY_SIGN_UP = "https://jobs.graphai.eu/sign-up.html"

export function hostnameOf(host: string): string {
  return String(host || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase()
}

export function isGraphaiHost(host: string): boolean {
  const h = hostnameOf(host)
  return h === "graphai.eu" || h.endsWith(".graphai.eu")
}

export function isVercelAppHost(host: string): boolean {
  return hostnameOf(host).endsWith(".vercel.app")
}

export const CANONICAL_HOST = "jobs2.graphai.eu"

/** Vercel aliases are not registered Clerk satellites; HTML goes to the graphai.eu host. */
export function clerkSatelliteForHost(_host: string): boolean {
  return false
}

export function canonicalHtmlHost(host: string): string | null {
  return isVercelAppHost(host) ? CANONICAL_HOST : null
}

export function clerkProviderPropsForHost(host: string, proto = "https") {
  const h = hostnameOf(host)
  if (clerkSatelliteForHost(h)) {
    const scheme = proto === "http" ? "http" : "https"
    return {
      isSatellite: true as const,
      domain: h,
      proxyUrl: `${scheme}://${h}/__clerk`,
      signInUrl: PRIMARY_SIGN_IN,
      signUpUrl: PRIMARY_SIGN_UP,
      satelliteAutoSync: true,
    }
  }
  return {
    isSatellite: false as const,
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  }
}
