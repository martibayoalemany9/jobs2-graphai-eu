import { NextResponse } from "next/server"
import { bqQuery, table } from "@/lib/bq"
import {
  eventIsLapsed,
  eventIsPaid,
  orderEmail,
  orderPaid,
  revolutGetOrder,
  revolutSignatureOk,
} from "@/lib/revolut"
import { canonicalEmail } from "@/lib/operators"
import { SUB_PRICE_CENTS } from "@/lib/entitlement"
import { markPaid, markLapsed } from "@/lib/billing"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const raw = await req.text()
  const header = req.headers.get("revolut-signature") || req.headers.get("Revolut-Signature")
  const ts = req.headers.get("revolut-request-timestamp")
  if (!revolutSignatureOk(raw, header, ts)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }
  const body = JSON.parse(raw || "{}") as {
    event?: string
    order_id?: string
    merchant_order_ext_ref?: string
    metadata?: { email?: string; clerk_user_id?: string }
    customer?: { email?: string }
  }
  const event = String(body.event || "")
  const orderId = String(body.order_id || body.merchant_order_ext_ref || "")
  let email = canonicalEmail(body.metadata?.email || body.customer?.email || "")
  let userId = body.metadata?.clerk_user_id || ""
  let cents = SUB_PRICE_CENTS
  if (orderId) {
    const order = await revolutGetOrder(orderId)
    if (order) {
      email = canonicalEmail(orderEmail(order) || email)
      const meta = (order.metadata || {}) as { clerk_user_id?: string }
      userId = String(meta.clerk_user_id || userId)
      cents = Number(order.amount) || SUB_PRICE_CENTS
      if (eventIsPaid(event) && !orderPaid(order)) {
        return NextResponse.json({ ok: true, paid: false, state: order.state || "pending" })
      }
    }
  }
  if (eventIsPaid(event) && email) {
    await markPaid({ email, userId, sessionId: orderId, event, amountCents: cents })
    return NextResponse.json({ ok: true, status: "paid" })
  }
  if (eventIsLapsed(event) && email) {
    await markLapsed(email)
    return NextResponse.json({ ok: true, status: "lapsed" })
  }
  return NextResponse.json({ ignored: true })
}
