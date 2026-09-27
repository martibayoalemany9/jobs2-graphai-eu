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
  try {
    const rows = await bqQuery<{
      free_mode: boolean
      is_operator: boolean
      trial_started_at: { value: string } | string | null
      status: string | null
    }>(
      `SELECT p.free_mode, p.is_operator, p.trial_started_at, e.status
       FROM ${table("profiles")} p
       LEFT JOIN ${table("entitlements")} e
         ON e.clerk_user_id = p.clerk_user_id
       WHERE p.clerk_user_id = @uid
       LIMIT 1`,
      { uid: userId },
    )
    const row = rows[0]
    if (row) {
      freeMode = Boolean(row.free_mode)
      isOperatorRow = Boolean(row.is_operator) || isOperatorRow
      entitlementStatus = row.status || entitlementStatus
      const ts = typeof row.trial_started_at === "string" ? row.trial_started_at : row.trial_started_at?.value
      if (ts) trialStartedAt = new Date(ts)
    }
  } catch {
    // BQ may be empty on first boot; fall back to trial/operator.
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
    specialties: claimSpecs,
    freeMode,
    entitlement: toEntitlement(c, false, freeMode),
    cap: c.cap,
  }
}
