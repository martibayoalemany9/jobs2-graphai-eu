import { NextResponse } from "next/server"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { bqQuery, table } from "@/lib/bq"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { SKILL_CATALOG } from "@/lib/skills-catalog"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"

const ALLOWED = new Set(SKILL_CATALOG.map((s) => s.id))

export async function GET() {
  const sess = await sessionCap()
  if (!sess.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json({
    email: sess.email,
    specialties: sess.specialties,
    free_mode: sess.freeMode,
    entitlement: sess.entitlement,
  })
}

export async function PUT(req: Request) {
  const a = await auth()
  if (!a.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { specialties?: string[]; free_mode?: boolean }
  const specialties = (body.specialties || []).filter((s) => ALLOWED.has(s))
  const user = await currentUser()
  const email = canonicalEmail(user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "")
  const operator = isOperatorEmail(email)
  const freeMode = Boolean(body.free_mode)

  const client = await clerkClient()
  await client.users.updateUserMetadata(a.userId, {
    publicMetadata: { specialties },
  })

  await bqQuery(
    `MERGE ${table("profiles")} T
     USING (SELECT @uid AS clerk_user_id) S
     ON T.clerk_user_id = S.clerk_user_id
     WHEN MATCHED THEN UPDATE SET
       specialties = @sp, free_mode = @fm, email = @email, email_canonical = @email,
       is_operator = @op, updated_at = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT
       (clerk_user_id, email, email_canonical, specialties, free_mode, is_operator, trial_started_at, created_at, updated_at)
       VALUES (@uid, @email, @email, @sp, @fm, @op, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
    { uid: a.userId, email, sp: specialties, fm: freeMode, op: operator },
  )

  await bqQuery(
    `MERGE ${table("entitlements")} T
     USING (SELECT @uid AS clerk_user_id) S
     ON T.clerk_user_id = S.clerk_user_id
     WHEN MATCHED THEN UPDATE SET email_canonical = @email, updated_at = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT
       (email_canonical, clerk_user_id, provider, status, amount_cents, trial_end, updated_at)
       VALUES (@email, @uid, @provider, @status, 500, TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), CURRENT_TIMESTAMP())`,
    {
      uid: a.userId,
      email,
      provider: operator ? "operator" : "trial",
      status: operator ? "operator" : "trial",
    },
  ).catch(() => {})

  const sess = await sessionCap()
  return NextResponse.json({ ok: true, specialties, free_mode: freeMode, entitlement: sess.entitlement })
}

export async function DELETE() {
  const a = await auth()
  if (!a.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  await bqQuery(`DELETE FROM ${table("profiles")} WHERE clerk_user_id = @uid`, { uid: a.userId }).catch(() => {})
  await bqQuery(`DELETE FROM ${table("entitlements")} WHERE clerk_user_id = @uid`, { uid: a.userId }).catch(() => {})
  await bqQuery(`DELETE FROM ${table("payments")} WHERE email_canonical IN (SELECT email_canonical FROM ${table("profiles")} WHERE clerk_user_id = @uid)`, { uid: a.userId }).catch(() => {})
  return NextResponse.json({ ok: true })
}
