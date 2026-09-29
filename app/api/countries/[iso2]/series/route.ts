import { NextResponse } from "next/server"
import { parseCountryScope } from "@/lib/country"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"
import { groupSpecialtySeries, pickSpikeSeries } from "@/lib/spike-series"

export const dynamic = "force-dynamic"

type DailyRow = {
  d: { value: string } | string
  n_available: unknown
  n_unavailable: unknown
  n_total: unknown
  specialty?: string
}

function mapPoint(r: DailyRow) {
  return {
    d: typeof r.d === "string" ? r.d : r.d?.value,
    n_available: num(r.n_available),
    n_unavailable: num(r.n_unavailable),
    n_total: num(r.n_total),
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ iso2: string }> }) {
  const { iso2: raw } = await ctx.params
  const scope = parseCountryScope(raw)
  if (!scope) return NextResponse.json({ error: "invalid country" }, { status: 404 })
  const iso2 = scope.iso2
  const sess = await sessionCap()
  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const days = sess.userId ? 365 : 90
  try {
    const series = scope.all
      ? await bqQuery<DailyRow>(
          `SELECT d, SUM(n_available) AS n_available, SUM(n_unavailable) AS n_unavailable, SUM(n_total) AS n_total
           FROM ${table("job_count_daily")}
           WHERE specialty = '*'
             AND d >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
           GROUP BY d
           ORDER BY d`,
          { days },
        )
      : await bqQuery<DailyRow>(
          `SELECT d, n_available, n_unavailable, n_total
           FROM ${table("job_count_daily")}
           WHERE country_iso2 = @cc AND specialty = '*'
             AND d >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
           ORDER BY d`,
          { cc: iso2, days },
        )
    const specRows = scope.all
      ? await bqQuery<DailyRow>(
          `SELECT d, specialty, SUM(n_available) AS n_available, SUM(n_unavailable) AS n_unavailable, SUM(n_total) AS n_total
           FROM ${table("job_count_daily")}
           WHERE specialty != '*'
             AND d >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
           GROUP BY d, specialty
           ORDER BY d`,
          { days },
        )
      : await bqQuery<DailyRow>(
          `SELECT d, specialty, n_available, n_unavailable, n_total
           FROM ${table("job_count_daily")}
           WHERE country_iso2 = @cc AND specialty != '*'
             AND d >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
           ORDER BY d`,
          { cc: iso2, days },
        )
    const kpi = scope.all
      ? []
      : await bqQuery<{ year_month: { value: string } | string; unemployment_rate: number; source: string }>(
          `SELECT year_month, unemployment_rate, source
           FROM ${table("kpi_country_monthly")}
           WHERE country_iso2 = @cc
           ORDER BY year_month DESC
           LIMIT 24`,
          { cc: iso2 },
        )
    let mapped = series.map(mapPoint)
    if (!mapped.length) {
      const snap = scope.all
        ? await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
            `SELECT COUNT(*) AS n_total,
                    COUNTIF(availability = 'available') AS n_available,
                    COUNTIF(availability = 'probably_unavailable') AS n_unavailable
             FROM ${table("job_offers_country")}`,
          )
        : await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
            `SELECT COUNT(*) AS n_total,
                    COUNTIF(availability = 'available') AS n_available,
                    COUNTIF(availability = 'probably_unavailable') AS n_unavailable
             FROM ${table("job_offers_country")} WHERE country_iso2 = @cc`,
            { cc: iso2 },
          )
      const n = num(snap[0]?.n_total)
      const today = new Date().toISOString().slice(0, 10)
      mapped = [
        {
          d: today,
          n_available: num(snap[0]?.n_available),
          n_unavailable: num(snap[0]?.n_unavailable),
          n_total: n,
        },
      ]
    }
    const bySpecialty = groupSpecialtySeries(
      specRows.map((r) => ({ ...mapPoint(r), specialty: String(r.specialty || "") })),
    )
    const spike = pickSpikeSeries(mapped, bySpecialty)
    return NextResponse.json({
      iso2,
      from,
      series: mapped,
      spike: spike
        ? {
            specialty: spike.specialty,
            series: spike.series,
            latestDelta: spike.latestDelta,
            score: spike.score,
            reason: spike.reason,
          }
        : null,
      kpi: kpi.map((k) => ({
        year_month: typeof k.year_month === "string" ? k.year_month : k.year_month?.value,
        unemployment_rate: Number(k.unemployment_rate),
        source: k.source,
      })),
      entitlement: sess.entitlement,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ iso2, series: [], spike: null, kpi: [], entitlement: sess.entitlement })
  }
}
