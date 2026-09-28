import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { canonicalEmail, isOperatorEmail } from "@/lib/operators"
import { markPaid } from "@/lib/billing"
import { orderEmail, orderPaid, revolutGetOrder } from "@/lib/revolut"
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
  const orderId = new URL(req.url).searchParams.get("order_id") || ""
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
  })
  const sess = await sessionCap()
  return NextResponse.json({ ok: true, paid: true, entitlement: sess.entitlement })
}
