import { NextResponse } from "next/server"
import { isIso2 } from "@/lib/country"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ iso2: string }> }) {
  const { iso2: raw } = await ctx.params
  const iso2 = String(raw || "").toUpperCase()
  if (!isIso2(iso2)) return NextResponse.json({ error: "invalid country" }, { status: 404 })
  const sess = await sessionCap()
  try {
    const totals = await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
      `SELECT n_total, n_available, n_unavailable
       FROM ${table("country_daily_latest")}
       WHERE country_iso2 = @cc LIMIT 1`,
      { cc: iso2 },
    )
    const kinds = await bqQuery<{ specialty: string; n_total: unknown }>(
      `SELECT specialty, n_total
       FROM ${table("country_specialty_counts")}
       WHERE country_iso2 = @cc
         AND as_of = (SELECT MAX(as_of) FROM ${table("country_specialty_counts")} WHERE country_iso2 = @cc)
         AND specialty != '*'
       ORDER BY n_total DESC`,
      { cc: iso2 },
    )
    const t = totals[0]
    let nTotal = num(t?.n_total)
    if (!nTotal) {
      const fallback = await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
        `SELECT COUNT(*) AS n_total,
                COUNTIF(availability = 'available') AS n_available,
                COUNTIF(availability = 'probably_unavailable') AS n_unavailable
         FROM ${table("job_offers_country")} WHERE country_iso2 = @cc`,
        { cc: iso2 },
      )
      nTotal = num(fallback[0]?.n_total)
      return NextResponse.json({
        iso2,
        n_total: nTotal,
        n_visible: sess.cap == null ? nTotal : Math.min(nTotal, sess.cap),
        n_available: num(fallback[0]?.n_available),
        n_unavailable: num(fallback[0]?.n_unavailable),
        kinds: kinds.map((k) => ({ specialty: k.specialty, n: num(k.n_total) })),
        entitlement: sess.entitlement,
      })
    }
    return NextResponse.json({
      iso2,
      n_total: nTotal,
      n_visible: sess.cap == null ? nTotal : Math.min(nTotal, sess.cap),
      n_available: num(t?.n_available),
      n_unavailable: num(t?.n_unavailable),
      kinds: kinds.map((k) => ({ specialty: k.specialty, n: num(k.n_total) })),
      entitlement: sess.entitlement,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ iso2, n_total: 0, kinds: [], entitlement: sess.entitlement })
  }
}
