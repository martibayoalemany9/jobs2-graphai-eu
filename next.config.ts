import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@google-cloud/bigquery"],
}

export default withSentryConfig(nextConfig, {
  org: "graphai-ou",
  project: "jobs2-graphai-eu",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
})
