import { NextResponse } from "next/server"
import { bqEnv } from "@/lib/bq"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    ok: true,
    sha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE || "dev",
    bq: bqEnv(),
  })
}
