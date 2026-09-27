import { NextResponse } from "next/server"
import { isIso2 } from "@/lib/country"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"

export async function GET(req: Request, ctx: { params: Promise<{ iso2: string }> }) {
  const { iso2: raw } = await ctx.params
  const iso2 = String(raw || "").toUpperCase()
  if (!isIso2(iso2)) return NextResponse.json({ error: "invalid country" }, { status: 404 })
  const sess = await sessionCap()
  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const days = sess.userId ? 365 : 90
  try {
    const series = await bqQuery<{
      d: { value: string } | string
      n_available: unknown
      n_unavailable: unknown
      n_total: unknown
    }>(
      `SELECT d, n_available, n_unavailable, n_total
       FROM ${table("job_count_daily")}
       WHERE country_iso2 = @cc AND specialty = '*'
         AND d >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
       ORDER BY d`,
      { cc: iso2, days },
    )
    const kpi = await bqQuery<{ year_month: { value: string } | string; unemployment_rate: number; source: string }>(
      `SELECT year_month, unemployment_rate, source
       FROM ${table("kpi_country_monthly")}
       WHERE country_iso2 = @cc
       ORDER BY year_month DESC
       LIMIT 24`,
      { cc: iso2 },
    )
    return NextResponse.json({
      iso2,
      from,
      series: series.map((r) => ({
        d: typeof r.d === "string" ? r.d : r.d?.value,
        n_available: num(r.n_available),
        n_unavailable: num(r.n_unavailable),
        n_total: num(r.n_total),
      })),
      kpi: kpi.map((k) => ({
        year_month: typeof k.year_month === "string" ? k.year_month : k.year_month?.value,
        unemployment_rate: Number(k.unemployment_rate),
        source: k.source,
      })),
      entitlement: sess.entitlement,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ iso2, series: [], kpi: [], entitlement: sess.entitlement })
  }
}
