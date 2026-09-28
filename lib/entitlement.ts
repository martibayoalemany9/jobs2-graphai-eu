import { isOperatorEmail } from "./operators"

export const CAP_ANON = 1_000
export const CAP_FREE = 10_000
export const CAP_POST_TRIAL = 1_000
export const SUB_PRICE_CENTS = 500
export const TRIAL_DAYS = 7

export type Tier = "anonymous" | "trial" | "free" | "paid" | "operator"

export type Entitlement = {
  tier: Tier
  cap_per_country: number | null
  truncated: boolean
  trial_ends_at: string | null
  free_mode: boolean
}

export function capFor(input: {
  email?: string
  isOperatorRow?: boolean
  freeMode?: boolean
  entitlementStatus?: string | null
  trialStartedAt?: Date | null
  now?: Date
}): { tier: Tier; cap: number | null; trialEndsAt: Date | null } {
  const now = input.now ?? new Date()
  if (isOperatorEmail(input.email || "") || input.isOperatorRow) {
    if (input.freeMode) return { tier: "operator", cap: CAP_FREE, trialEndsAt: null }
    return { tier: "operator", cap: null, trialEndsAt: null }
  }
  if (!input.email) return { tier: "anonymous", cap: CAP_ANON, trialEndsAt: null }

  const trialEnd = input.trialStartedAt
    ? new Date(input.trialStartedAt.getTime() + TRIAL_DAYS * 86400_000)
    : null
  const trialActive = Boolean(trialEnd && now < trialEnd && input.entitlementStatus !== "paid")

  if (input.entitlementStatus === "paid") {
    if (input.freeMode) return { tier: "paid", cap: CAP_FREE, trialEndsAt: trialEnd }
    return { tier: "paid", cap: null, trialEndsAt: trialEnd }
  }
  if (input.entitlementStatus === "lapsed") {
    return { tier: "free", cap: CAP_POST_TRIAL, trialEndsAt: trialEnd }
  }
  if (trialActive) return { tier: "trial", cap: CAP_FREE, trialEndsAt: trialEnd }
  return { tier: "free", cap: CAP_POST_TRIAL, trialEndsAt: trialEnd }
}

export function toEntitlement(
  cap: { tier: Tier; cap: number | null; trialEndsAt: Date | null },
  truncated: boolean,
  freeMode: boolean,
): Entitlement {
  return {
    tier: cap.tier,
    cap_per_country: cap.cap,
    truncated,
    trial_ends_at: cap.trialEndsAt ? cap.trialEndsAt.toISOString() : null,
    free_mode: freeMode,
  }
}
