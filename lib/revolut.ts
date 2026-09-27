import { createHmac, timingSafeEqual } from "node:crypto"
import { SUB_PRICE_CENTS } from "./entitlement"

export const REVOLUT_API_VERSION = "2026-04-20"
const REVOLUT_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000

export function revolutSecret(): string {
  return process.env.REVOLUT_API_SECRET || process.env.REVOLUT_SECRET_KEY || ""
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

export function revolutSignatureOk(rawBody: string, header: string | null): boolean {
  const secret = revolutSecret()
  if (!secret || !header) return false
  const parts = String(header).split(",")
  let ts = ""
  let sig = ""
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
  if (!ts || !sig) return false
  const age = Math.abs(Date.now() - Number(ts) * (String(ts).length <= 10 ? 1000 : 1))
  if (!Number.isFinite(age) || age > REVOLUT_WEBHOOK_MAX_AGE_MS) return false
  const payload = `v1.${ts}.${rawBody}`
  const expect = createHmac("sha256", secret).update(payload).digest("hex")
  const a = Buffer.from(expect)
  const b = Buffer.from(sig)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function createRevolutOrder(opts: {
  email: string
  userId: string
  origin: string
}): Promise<{ url: string; id: string }> {
  const secret = revolutSecret()
  if (!secret) {
    const err = new Error("Revolut is not configured")
    ;(err as Error & { status?: number }).status = 503
    throw err
  }
  const res = await fetch(`${revolutMerchantHost()}/api/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Revolut-Api-Version": REVOLUT_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: SUB_PRICE_CENTS,
      currency: "EUR",
      description: "Graphai Jobs2 monthly",
      capture_mode: "automatic",
      merchant_order_ext_ref: `jobs2-${opts.userId}-${Date.now()}`,
      customer_email: opts.email,
      metadata: {
        email: opts.email,
        clerk_user_id: opts.userId,
        product: "jobs2_subscription",
      },
      redirect_url: `${opts.origin}/?view=settings&pay=revolut`,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    checkout_url?: string
    token?: string
    public_id?: string
  }
  if (!res.ok || !data.id) {
    const err = new Error((data as { message?: string }).message || "Revolut order failed")
    ;(err as Error & { status?: number }).status = res.status || 502
    throw err
  }
  const url =
    data.checkout_url ||
    `https://${revolutEnv() === "sandbox" ? "sandbox-checkout" : "checkout"}.revolut.com/pay/${data.token || data.public_id || data.id}`
  return { url, id: data.id }
}

export function eventIsPaid(event: string): boolean {
  const e = String(event || "").toUpperCase()
  return e.includes("ORDER_COMPLETED") || e.includes("ORDER_AUTHORISED") || e.includes("ORDER_PAID")
}

export function eventIsLapsed(event: string): boolean {
  const e = String(event || "").toUpperCase()
  return e.includes("CANCEL") || e.includes("EXPIRED") || e.includes("LAPSED")
}
