import { auth, currentUser } from "@clerk/nextjs/server"
import { capFor, toEntitlement, type Entitlement } from "./entitlement"
import { canonicalEmail, isOperatorEmail } from "./operators"
import { bqQuery, table } from "./bq"

export type SessionCap = {
  email?: string
  userId?: string | null
  specialties: string[]
  freeMode: boolean
  entitlement: Entitlement
  cap: number | null
}

function parseSpecialties(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s)).filter(Boolean)
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return []
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) return parsed.map((s) => String(s)).filter(Boolean)
    } catch {
      return t.split(",").map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

export async function sessionCap(): Promise<SessionCap> {
  if (!process.env.CLERK_SECRET_KEY) {
    const c = capFor({})
    return {
      specialties: [],
      freeMode: false,
      entitlement: toEntitlement(c, false, false),
      cap: c.cap,
    }
  }
  const a = await auth()
  const userId = a.userId
  const claimSpecs = parseSpecialties((a.sessionClaims as Record<string, unknown> | null)?.specialties)
  if (!userId) {
    const c = capFor({})
    return {
      specialties: [],
      freeMode: false,
      entitlement: toEntitlement(c, false, false),
      cap: c.cap,
    }
  }

  let email = ""
  try {
    const u = await currentUser()
    email = canonicalEmail(u?.primaryEmailAddress?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || "")
  } catch {
    email = ""
  }

  let freeMode = false
  let isOperatorRow = isOperatorEmail(email)
  let entitlementStatus: string | null = isOperatorRow ? "operator" : "trial"
  let trialStartedAt: Date | null = null
  let profileSpecs: string[] = []
  try {
    const rows = await bqQuery<{
      free_mode: boolean
      is_operator: boolean
      trial_started_at: { value: string } | string | null
      status: string | null
      specialties: string[] | string | null
    }>(
      `SELECT p.free_mode, p.is_operator, p.trial_started_at, e.status, p.specialties
       FROM ${table("profiles")} p
       LEFT JOIN ${table("entitlements")} e
         ON e.clerk_user_id = p.clerk_user_id
       WHERE p.clerk_user_id = @uid
       ORDER BY p.updated_at DESC
       LIMIT 1`,
      { uid: userId },
    )
    const row = rows[0]
    if (row) {
      freeMode = Boolean(row.free_mode)
      isOperatorRow = Boolean(row.is_operator) || isOperatorRow
      entitlementStatus = row.status || entitlementStatus
      profileSpecs = parseSpecialties(row.specialties)
      const ts = typeof row.trial_started_at === "string" ? row.trial_started_at : row.trial_started_at?.value
      if (ts) trialStartedAt = new Date(ts)
    } else {
      trialStartedAt = new Date()
      entitlementStatus = isOperatorRow ? "operator" : "trial"
      await bqQuery(
        `MERGE ${table("profiles")} T
         USING (SELECT @uid AS clerk_user_id) S
         ON T.clerk_user_id = S.clerk_user_id
         WHEN NOT MATCHED THEN INSERT
           (clerk_user_id, email, email_canonical, specialties, free_mode, is_operator, trial_started_at, created_at, updated_at)
           VALUES (@uid, @email, @email, @sp, FALSE, @op, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        { uid: userId, email, sp: [] as string[], op: isOperatorRow },
      ).catch(() => {})
      await bqQuery(
        `MERGE ${table("entitlements")} T
         USING (SELECT @uid AS clerk_user_id) S
         ON T.clerk_user_id = S.clerk_user_id
         WHEN NOT MATCHED THEN INSERT
           (email_canonical, clerk_user_id, provider, status, amount_cents, trial_end, updated_at)
           VALUES (@email, @uid, @provider, @status, 500, TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), CURRENT_TIMESTAMP())`,
        {
          uid: userId,
          email,
          provider: isOperatorRow ? "operator" : "trial",
          status: isOperatorRow ? "operator" : "trial",
        },
      ).catch(() => {})
    }
  } catch {
    // BQ may be empty on first boot; fall back to trial/operator.
    if (!trialStartedAt) trialStartedAt = new Date()
  }

  const c = capFor({
    email,
    isOperatorRow,
    freeMode,
    entitlementStatus,
    trialStartedAt,
  })
  return {
    email,
    userId,
    specialties: claimSpecs.length ? claimSpecs : profileSpecs,
    freeMode,
    entitlement: toEntitlement(c, false, freeMode),
    cap: c.cap,
  }
}
