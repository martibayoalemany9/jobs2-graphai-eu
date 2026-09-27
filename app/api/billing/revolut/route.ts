import { NextResponse } from "next/server"
import { bqQuery, table } from "@/lib/bq"
import { eventIsLapsed, eventIsPaid, revolutSignatureOk } from "@/lib/revolut"
import { canonicalEmail } from "@/lib/operators"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const raw = await req.text()
  const header = req.headers.get("revolut-signature") || req.headers.get("Revolut-Signature")
  if (!revolutSignatureOk(raw, header)) {
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
  const email = canonicalEmail(body.metadata?.email || body.customer?.email || "")
  const userId = body.metadata?.clerk_user_id || ""
  const orderId = body.order_id || body.merchant_order_ext_ref || ""
  if (eventIsPaid(event) && email) {
    await bqQuery(
      `INSERT INTO ${table("payments")} (paid_at, email_canonical, provider, session_id, status, amount_cents, note)
       VALUES (CURRENT_TIMESTAMP(), @email, 'revolut', @sid, 'paid', 500, @event)`,
      { email, sid: orderId, event },
    ).catch(() => {})
    await bqQuery(
      `MERGE ${table("entitlements")} T
       USING (SELECT @email AS email_canonical) S
       ON T.email_canonical = S.email_canonical
       WHEN MATCHED THEN UPDATE SET status = 'paid', provider = 'revolut', revolut_order_id = @sid, updated_at = CURRENT_TIMESTAMP()
       WHEN NOT MATCHED THEN INSERT (email_canonical, clerk_user_id, provider, status, revolut_order_id, amount_cents, updated_at)
         VALUES (@email, @uid, 'revolut', 'paid', @sid, 500, CURRENT_TIMESTAMP())`,
      { email, sid: orderId, uid: userId },
    ).catch(() => {})
    return NextResponse.json({ ok: true, status: "paid" })
  }
  if (eventIsLapsed(event) && email) {
    await bqQuery(
      `UPDATE ${table("entitlements")} SET status = 'lapsed', updated_at = CURRENT_TIMESTAMP()
       WHERE email_canonical = @email`,
      { email },
    ).catch(() => {})
    return NextResponse.json({ ok: true, status: "lapsed" })
  }
  return NextResponse.json({ ignored: true })
}
