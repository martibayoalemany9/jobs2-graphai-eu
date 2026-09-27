import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"
export const revalidate = 300

export async function GET() {
  const sess = await sessionCap()
  try {
    const rows = await bqQuery<{
      country_iso2: string
      n_total: unknown
      n_available: unknown
      n_unavailable: unknown
      probed: unknown
    }>(
      `SELECT
         c.country_iso2,
         c.n_total,
         c.n_available,
         c.n_unavailable,
         (SELECT COUNT(1) FROM ${table("job_availability_checks")} k
           WHERE k.job_key IN (
             SELECT job_key FROM ${table("job_offers_country")} j WHERE j.country_iso2 = c.country_iso2 LIMIT 1
           )) AS probed
       FROM ${table("country_daily_latest")} c
       ORDER BY n_total DESC`,
    )
    const countries = rows.map((r) => {
      const nTotal = num(r.n_total)
      const cap = sess.cap
      return {
        iso2: r.country_iso2,
        n_total: nTotal,
        n_visible: cap == null ? nTotal : Math.min(nTotal, cap),
        n_available: num(r.n_available),
        n_unavailable: num(r.n_unavailable),
        probed: num(r.probed) > 0,
      }
    })
    return NextResponse.json(
      { countries, entitlement: sess.entitlement },
      { headers: { "Cache-Control": sess.userId ? "private, max-age=30" : "public, s-maxage=300" } },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { countries: [], entitlement: sess.entitlement, error: "serving tables not ready" },
      { status: 200 },
    )
  }
}
