import { bqQuery, table } from "./bq"
import { SUB_PRICE_CENTS } from "./entitlement"

export async function markPaid(opts: {
  email: string
  userId?: string
  sessionId: string
  event: string
  amountCents?: number
}): Promise<void> {
  const email = String(opts.email || "").toLowerCase()
  const sid = String(opts.sessionId || "").slice(0, 120)
  const cents = Number(opts.amountCents) || SUB_PRICE_CENTS
  const uid = String(opts.userId || "")
  if (sid) {
    const existing = await bqQuery<{ session_id: string }>(
      `SELECT session_id FROM ${table("payments")} WHERE session_id = @sid AND status = 'paid' LIMIT 1`,
      { sid },
    ).catch(() => [])
    if (existing.length) return
  }
  await bqQuery(
    `INSERT INTO ${table("payments")} (paid_at, email_canonical, provider, session_id, status, amount_cents, note)
     VALUES (CURRENT_TIMESTAMP(), @email, 'revolut', @sid, 'paid', @cents, @event)`,
    { email, sid, cents, event: String(opts.event || "paid").slice(0, 400) },
  ).catch(() => {})
  await bqQuery(
    `MERGE ${table("entitlements")} T
     USING (SELECT @email AS email_canonical) S
     ON T.email_canonical = S.email_canonical
     WHEN MATCHED THEN UPDATE SET
       status = 'paid', provider = 'revolut', revolut_order_id = @sid,
       amount_cents = @cents, clerk_user_id = IF(@uid = '', T.clerk_user_id, @uid),
       updated_at = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT
       (email_canonical, clerk_user_id, provider, status, revolut_order_id, amount_cents, updated_at)
       VALUES (@email, @uid, 'revolut', 'paid', @sid, @cents, CURRENT_TIMESTAMP())`,
    { email, sid, uid, cents },
  ).catch(() => {})
}

export async function markLapsed(email: string): Promise<void> {
  await bqQuery(
    `UPDATE ${table("entitlements")} SET status = 'lapsed', updated_at = CURRENT_TIMESTAMP()
     WHERE email_canonical = @email`,
    { email: String(email || "").toLowerCase() },
  ).catch(() => {})
}
