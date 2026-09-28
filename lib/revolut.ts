import { createHmac, timingSafeEqual } from "node:crypto"
import { SUB_PRICE_CENTS } from "./entitlement"

export const REVOLUT_API_VERSION = "2026-04-20"
export const REVOLUT_PLAN_NAME = "Graphai Jobs2"
const REVOLUT_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000

type RevolutJson = Record<string, unknown>

export function revolutSecret(): string {
  return process.env.REVOLUT_API_SECRET || process.env.REVOLUT_SECRET_KEY || ""
}

export function revolutWebhookSecret(): string {
  return process.env.REVOLUT_WEBHOOK_SECRET || revolutSecret()
}

export function revolutPublicKey(): string {
  return process.env.REVOLUT_API_PUBLIC_KEY || process.env.REVOLUT_PUBLIC_KEY || ""
}

export function revolutEnv(): "live" | "sandbox" {
  const raw = String(process.env.REVOLUT_ENV || process.env.REVOLUT_API_MODE || "live").toLowerCase()
  return raw === "sandbox" || raw === "test" ? "sandbox" : "live"
}

export function revolutMerchantHost(): string {
  return revolutEnv() === "sandbox" ? "https://sandbox-merchant.revolut.com" : "https://merchant.revolut.com"
}

function hmacHexEqual(got: string, expected: string): boolean {
  const a = Buffer.from(String(got || ""), "utf8")
  const b = Buffer.from(String(expected || ""), "utf8")
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function timestampMs(ts: string): number {
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return NaN
  return String(ts).length <= 10 ? n * 1000 : n
}

export function revolutSignatureOk(rawBody: string, header: string | null, timestampHeader?: string | null): boolean {
  const secret = revolutWebhookSecret()
  if (!secret) return false
  let ts = ""
  let sig = ""
  if (header) {
    const parts = String(header).split(",")
    for (const p of parts) {
      const [k, v] = p.split("=")
      if (k?.trim() === "t") ts = (v || "").trim()
      if (k?.trim() === "v1") sig = (v || "").trim()
    }
    if (!ts || !sig) {
      const m = String(header).match(/^v1\.(\d+)\.(.+)$/)
      if (m) {
        ts = m[1]
        sig = m[2]
      }
    }
    if (!sig) {
      const v1 = parts.map((p) => p.trim()).find((p) => p.startsWith("v1="))
      if (v1) sig = v1.slice(3)
    }
  }
  if ((!ts || !sig) && timestampHeader && header) {
    ts = String(timestampHeader)
    sig = String(header).replace(/^v1=/i, "").trim()
  }
  if (!ts || !sig) return false
  const tsMs = timestampMs(ts)
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > REVOLUT_WEBHOOK_MAX_AGE_MS) return false
  const payload = `v1.${ts}.${rawBody}`
  const expect = createHmac("sha256", secret).update(payload).digest("hex")
  return String(sig)
    .split(",")
    .some((part) => hmacHexEqual(part.trim().replace(/^v1=/i, ""), expect))
}

async function revolutFetch(path: string, opts: { method?: string; body?: unknown; idempotency?: string } = {}): Promise<RevolutJson> {
  const secret = revolutSecret()
  if (!secret) {
    const err = new Error("Revolut Merchant API is not configured (REVOLUT_API_SECRET)")
    ;(err as Error & { status?: number }).status = 503
    throw err
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
    "Revolut-Api-Version": process.env.REVOLUT_API_VERSION || REVOLUT_API_VERSION,
  }
  if (opts.body) headers["Content-Type"] = "application/json"
  if (opts.idempotency) headers["Idempotency-Key"] = opts.idempotency
  const res = await fetch(`${revolutMerchantHost()}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let data: RevolutJson = {}
  try {
    data = text ? (JSON.parse(text) as RevolutJson) : {}
  } catch {
    data = { raw: text.slice(0, 280) }
  }
  if (!res.ok) {
    const msg =
      (data.message as string) ||
      (data.error as string) ||
      (Array.isArray(data.errors) ? String((data.errors as { message?: string }[])[0]?.message) : "") ||
      `Revolut ${res.status}`
    const err = new Error(String(msg)) as Error & { status?: number; data?: RevolutJson }
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502
    err.data = data
    throw err
  }
  return data
}

function asRecord(v: unknown): RevolutJson {
  return v && typeof v === "object" ? (v as RevolutJson) : {}
}

export function orderPaid(order: RevolutJson | null | undefined): boolean {
  const state = String(order?.state || order?.status || "").toLowerCase()
  return /completed|authorised|captured/.test(state)
}

export function orderEmail(order: RevolutJson | null | undefined): string {
  const customer = asRecord(order?.customer)
  const metadata = asRecord(order?.metadata)
  const merchant = asRecord(order?.merchant_order_data)
  return String(customer.email || order?.email || metadata.email || merchant.email || "").toLowerCase()
}

export async function revolutGetOrder(orderId: string): Promise<RevolutJson | null> {
  const id = String(orderId || "").trim()
  if (!id || !revolutSecret()) return null
  try {
    return await revolutFetch("/api/orders/" + encodeURIComponent(id))
  } catch {
    return null
  }
}

async function ensureRevolutPlan(): Promise<{ variation_id: string }> {
  const listed = await revolutFetch("/api/subscription-plans?limit=100")
  const plans = (listed.subscription_plans as RevolutJson[]) || []
  for (const plan of plans) {
    if (String(plan.name || "") !== REVOLUT_PLAN_NAME) continue
    if (String(plan.state || "") === "deactivated") continue
    for (const variation of (plan.variations as RevolutJson[]) || []) {
      for (const phase of (variation.phases as RevolutJson[]) || []) {
        if (phase.cycle_duration === "P1M" && Number(phase.amount) === SUB_PRICE_CENTS && phase.currency === "EUR") {
          return { variation_id: String(variation.id || "") }
        }
      }
    }
  }
  const created = await revolutFetch("/api/subscription-plans", {
    method: "POST",
    body: {
      name: REVOLUT_PLAN_NAME,
      variations: [{ phases: [{ ordinal: 1, cycle_duration: "P1M", amount: SUB_PRICE_CENTS, currency: "EUR" }] }],
    },
  })
  const variations = (created.variations as RevolutJson[]) || []
  const variation_id = String(variations[0]?.id || "")
  if (!variation_id) throw new Error("Revolut plan variation missing")
  return { variation_id }
}

async function createOneOffOrder(opts: { email: string; userId: string; origin: string; success: string }): Promise<{
  url: string
  id: string
  mode: "order"
  subscription_id?: string
}> {
  const order = await revolutFetch("/api/orders", {
    method: "POST",
    body: {
      amount: SUB_PRICE_CENTS,
      currency: "EUR",
      description: "Graphai Jobs2 — €5 / month",
      redirect_url: opts.success,
      customer: { email: opts.email },
      metadata: {
        email: opts.email,
        clerk_user_id: opts.userId,
        product: "jobs2_subscription",
        kind: "subscription",
      },
      merchant_order_data: { reference: "jobs2:" + opts.email },
    },
  })
  const id = String(order.id || "")
  if (id) {
    try {
      await revolutFetch("/api/orders/" + encodeURIComponent(id), {
        method: "PATCH",
        body: { redirect_url: `${opts.origin}/?view=settings&pay=revolut&order_id=${encodeURIComponent(id)}` },
      })
    } catch {
      /* redirect_url is best-effort */
    }
  }
  const token = String(order.token || order.public_id || id)
  const url =
    String(order.checkout_url || "") ||
    `https://${revolutEnv() === "sandbox" ? "sandbox-checkout" : "checkout"}.revolut.com/pay/${token}`
  if (!id || !url) {
    const err = new Error("Revolut order has no checkout_url") as Error & { status?: number }
    err.status = 502
    throw err
  }
  return { url, id, mode: "order" }
}

export async function createRevolutCheckout(opts: {
  email: string
  userId: string
  origin: string
}): Promise<{ url: string; id: string; mode: "subscription" | "order"; subscription_id?: string }> {
  const email = String(opts.email || "").toLowerCase()
  const origin = opts.origin.replace(/\/$/, "")
  const success = `${origin}/?view=settings&pay=revolut`
  if (!revolutSecret()) {
    const err = new Error("Revolut is not configured") as Error & { status?: number }
    err.status = 503
    throw err
  }
  try {
    const { variation_id } = await ensureRevolutPlan()
    const customer = await revolutFetch("/api/customers", { method: "POST", body: { email } })
    const sub = await revolutFetch("/api/subscriptions", {
      method: "POST",
      idempotency: "jobs2-sub-" + email + "-" + new Date().toISOString().slice(0, 10),
      body: {
        plan_variation_id: variation_id,
        customer_id: customer.id,
        setup_order_redirect_url: success + "&order_id=pending",
        external_reference: "jobs2:" + email + ":" + opts.userId,
      },
    })
    const setupId = String(sub.setup_order_id || "")
    if (setupId) {
      try {
        await revolutFetch("/api/orders/" + encodeURIComponent(setupId), {
          method: "PATCH",
          body: { redirect_url: `${origin}/?view=settings&pay=revolut&order_id=${encodeURIComponent(setupId)}` },
        })
      } catch {
        /* redirect_url is best-effort */
      }
    }
    const order = setupId ? await revolutGetOrder(setupId) : null
    const url = String(order?.checkout_url || "")
    if (!url) throw new Error("Revolut subscription setup has no checkout_url")
    return {
      url,
      id: setupId,
      subscription_id: String(sub.id || ""),
      mode: "subscription",
    }
  } catch {
    return createOneOffOrder({ email, userId: opts.userId, origin, success })
  }
}

/** @deprecated use createRevolutCheckout */
export async function createRevolutOrder(opts: { email: string; userId: string; origin: string }): Promise<{ url: string; id: string }> {
  const checkout = await createRevolutCheckout(opts)
  return { url: checkout.url, id: checkout.id }
}

export function eventIsPaid(event: string): boolean {
  const e = String(event || "").toUpperCase()
  return (
    e.includes("ORDER_COMPLETED") ||
    e.includes("ORDER_AUTHORISED") ||
    e.includes("ORDER_PAID") ||
    e.includes("SUBSCRIPTION_CREATED") ||
    e.includes("SUBSCRIPTION_UPDATED")
  )
}

export function eventIsLapsed(event: string): boolean {
  const e = String(event || "").toUpperCase()
  return e.includes("CANCEL") || e.includes("EXPIRED") || e.includes("LAPSED")
}
