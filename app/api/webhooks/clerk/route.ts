import { NextResponse } from "next/server"
import { bqQuery, table } from "@/lib/bq"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 })
  const body = (await req.json().catch(() => ({}))) as {
    type?: string
    data?: { id?: string }
  }
  if (body.type === "user.deleted" && body.data?.id) {
    const uid = body.data.id
    await bqQuery(`DELETE FROM ${table("profiles")} WHERE clerk_user_id = @uid`, { uid }).catch(() => {})
    await bqQuery(`DELETE FROM ${table("entitlements")} WHERE clerk_user_id = @uid`, { uid }).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
