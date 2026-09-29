import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"
export const revalidate = 300

type Row = {
  country_iso2: string
  n_total: unknown
  n_available: unknown
  n_unavailable: unknown
  probed: unknown
  n_companies: unknown
  n_this_month: unknown
  n_remote: unknown
  n_senior: unknown
}

export async function GET() {
  const sess = await sessionCap()
  try {
    let rows = await bqQuery<Row>(
      `SELECT
         c.country_iso2,
         c.n_total,
         c.n_available,
         c.n_unavailable,
         IFNULL(p.probed, 0) AS probed,
         IFNULL(s.n_companies, 0) AS n_companies,
         IFNULL(s.n_this_month, 0) AS n_this_month,
         IFNULL(s.n_remote, 0) AS n_remote,
         IFNULL(s.n_senior, 0) AS n_senior
       FROM ${table("country_daily_latest")} c
       LEFT JOIN (
         SELECT j.country_iso2, 1 AS probed
         FROM ${table("job_availability_checks")} k
         JOIN ${table("job_offers_country")} j ON j.job_key = k.job_key
         GROUP BY j.country_iso2
       ) p ON p.country_iso2 = c.country_iso2
       LEFT JOIN ${table("country_map_stats")} s ON s.country_iso2 = c.country_iso2
       ORDER BY n_total DESC`,
    )
    if (!rows.length) {
      rows = await bqQuery<Row>(
        `SELECT
           country_iso2,
           COUNT(*) AS n_total,
           COUNTIF(availability = 'available') AS n_available,
           COUNTIF(availability = 'probably_unavailable') AS n_unavailable,
           0 AS probed,
           COUNT(DISTINCT company) AS n_companies,
           COUNTIF(appeared_at_ts >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE(), MONTH))) AS n_this_month,
           0 AS n_remote,
           0 AS n_senior
         FROM ${table("job_offers_country")}
         GROUP BY country_iso2
         ORDER BY n_total DESC`,
      )
    }
    const countries = rows.map((r) => {
      const nTotal = num(r.n_total)
      const cap = sess.cap
      const nRemote = num(r.n_remote)
      const nSenior = num(r.n_senior)
      return {
        iso2: r.country_iso2,
        n_total: nTotal,
        n_visible: cap == null ? nTotal : Math.min(nTotal, cap),
        n_available: num(r.n_available),
        n_unavailable: num(r.n_unavailable),
        n_companies: num(r.n_companies),
        n_this_month: num(r.n_this_month),
        n_remote: nRemote,
        n_senior: nSenior,
        remote_share: nTotal ? nRemote / nTotal : 0,
        senior_share: nTotal ? nSenior / nTotal : 0,
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
