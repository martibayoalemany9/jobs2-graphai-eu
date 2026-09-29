import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { markPaid } from "@/lib/billing"
import { orderEmail, orderPaid, revolutGetOrder } from "@/lib/revolut"
import { retrieveCheckoutSession, sessionPaid } from "@/lib/stripe"
import { sessionCap } from "@/lib/session-entitlement"
import { SUB_PRICE_CENTS } from "@/lib/entitlement"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const a = await auth()
  if (!a.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const user = await currentUser()
  const email = canonicalEmail(user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "")
  if (isOperatorEmail(email)) {
    const sess = await sessionCap()
    return NextResponse.json({ ok: true, paid: true, operator: true, entitlement: sess.entitlement })
  }
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id") || ""
  const orderId = url.searchParams.get("order_id") || ""

  if (sessionId) {
    const session = await retrieveCheckoutSession(sessionId)
    if (!session || !sessionPaid(session)) {
      const sess = await sessionCap()
      return NextResponse.json({
        ok: false,
        paid: false,
        state: session?.payment_status || session?.status || "missing",
        entitlement: sess.entitlement,
      })
    }
    const meta = (session.metadata || {}) as { email?: string; clerk_user_id?: string }
    const paidEmail = canonicalEmail(meta.email || session.customer_email || email)
    if (paidEmail && paidEmail !== email) {
      return NextResponse.json({ error: "session email mismatch" }, { status: 403 })
    }
    await markPaid({
      email,
      userId: a.userId,
      sessionId,
      event: "stripe_return",
      amountCents: Number(session.amount_total) || SUB_PRICE_CENTS,
      provider: "stripe",
    })
    const sess = await sessionCap()
    return NextResponse.json({ ok: true, paid: true, entitlement: sess.entitlement })
  }

  if (!orderId || orderId === "pending") {
    const sess = await sessionCap()
    return NextResponse.json({ ok: true, paid: sess.entitlement.tier === "paid", entitlement: sess.entitlement })
  }
  const order = await revolutGetOrder(orderId)
  if (!order || !orderPaid(order)) {
    const sess = await sessionCap()
    return NextResponse.json({ ok: false, paid: false, state: order?.state || "missing", entitlement: sess.entitlement })
  }
  const paidEmail = canonicalEmail(orderEmail(order) || email)
  if (paidEmail && paidEmail !== email) {
    return NextResponse.json({ error: "order email mismatch" }, { status: 403 })
  }
  await markPaid({
    email,
    userId: a.userId,
    sessionId: orderId,
    event: "return",
    amountCents: Number(order.amount) || SUB_PRICE_CENTS,
    provider: "revolut",
  })
  const sess = await sessionCap()
  return NextResponse.json({ ok: true, paid: true, entitlement: sess.entitlement })
}
