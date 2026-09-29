import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { markLapsed, markPaid } from "@/lib/billing"
import { canonicalEmail } from "@/lib/operators"
import { SUB_PRICE_CENTS } from "@/lib/entitlement"
import { verifyStripeEvent } from "@/lib/stripe"

export const dynamic = "force-dynamic"

function emailFromSession(session: Stripe.Checkout.Session): string {
  const meta = (session.metadata || {}) as { email?: string }
  return canonicalEmail(meta.email || session.customer_email || "")
}

function emailFromSub(sub: Stripe.Subscription): string {
  const meta = (sub.metadata || {}) as { email?: string }
  return canonicalEmail(meta.email || "")
}

export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get("stripe-signature")
  let event: Stripe.Event
  try {
    event = verifyStripeEvent(raw, sig)
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 400
    return NextResponse.json({ error: (err as Error).message }, { status })
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === "unpaid") {
      return NextResponse.json({ ok: true, paid: false, state: "unpaid" })
    }
    const email = emailFromSession(session)
    const uid = String((session.metadata || {}).clerk_user_id || session.client_reference_id || "")
    if (email) {
      await markPaid({
        email,
        userId: uid,
        sessionId: session.id,
        event: event.type,
        amountCents: Number(session.amount_total) || SUB_PRICE_CENTS,
        provider: "stripe",
      })
    }
    return NextResponse.json({ ok: true, status: "paid" })
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    const meta = (invoice.metadata || {}) as { email?: string; clerk_user_id?: string }
    const email = canonicalEmail(meta.email || invoice.customer_email || "")
    if (email) {
      await markPaid({
        email,
        userId: meta.clerk_user_id || "",
        sessionId: String(invoice.id || ""),
        event: event.type,
        amountCents: Number(invoice.amount_paid) || SUB_PRICE_CENTS,
        provider: "stripe",
      })
    }
    return NextResponse.json({ ok: true, status: "paid" })
  }

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const obj = event.data.object as Stripe.Subscription | Stripe.Invoice
    const email =
      "customer_email" in obj
        ? canonicalEmail(String(obj.customer_email || ""))
        : emailFromSub(obj as Stripe.Subscription)
    if (email) {
      await markLapsed(email)
      return NextResponse.json({ ok: true, status: "lapsed" })
    }
  }

  return NextResponse.json({ ignored: true, type: event.type })
}
