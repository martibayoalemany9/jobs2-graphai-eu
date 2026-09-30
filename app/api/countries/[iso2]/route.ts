import { NextResponse } from "next/server"
import { parseCountryScope } from "@/lib/country"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"

function body(
  iso2: string,
  nTotal: number,
  nAvailable: number,
  nUnavailable: number,
  kinds: { specialty: string; n: number; n_total: number; n_available: number; n_unavailable: number }[],
  cap: number | null,
  entitlement: unknown,
) {
  return {
    iso2,
    n_total: nTotal,
    n_visible: cap == null ? nTotal : Math.min(nTotal, cap),
    n_available: nAvailable,
    n_unavailable: nUnavailable,
    kinds,
    entitlement,
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ iso2: string }> }) {
  const { iso2: raw } = await ctx.params
  const scope = parseCountryScope(raw)
  if (!scope) return NextResponse.json({ error: "invalid country" }, { status: 404 })
  const sess = await sessionCap()
  const iso2 = scope.iso2
  try {
    if (scope.all) {
      const [totals, kinds] = await Promise.all([
        bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
          `SELECT SUM(n_total) AS n_total, SUM(n_available) AS n_available, SUM(n_unavailable) AS n_unavailable
           FROM ${table("country_daily_latest")}`,
        ),
        bqQuery<{ specialty: string; n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
          `SELECT specialty, SUM(n_total) AS n_total, SUM(n_available) AS n_available, SUM(n_unavailable) AS n_unavailable
           FROM ${table("country_specialty_counts")}
           WHERE specialty != '*'
             AND as_of = (SELECT MAX(as_of) FROM ${table("country_specialty_counts")})
           GROUP BY specialty
           ORDER BY n_total DESC`,
        ),
      ])
      let nTotal = num(totals[0]?.n_total)
      let nAvailable = num(totals[0]?.n_available)
      let nUnavailable = num(totals[0]?.n_unavailable)
      if (!nTotal) {
        const fallback = await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
          `SELECT COUNT(*) AS n_total,
                  COUNTIF(j.availability = 'available') AS n_available,
                  COUNTIF(j.availability = 'probably_unavailable') AS n_unavailable
           FROM ${table("job_offers_country")} j
           JOIN ${table("job_offer_boards")} b ON b.job_key = j.job_key AND b.is_master`,
        )
        nTotal = num(fallback[0]?.n_total)
        nAvailable = num(fallback[0]?.n_available)
        nUnavailable = num(fallback[0]?.n_unavailable)
      }
      return NextResponse.json(
        body(
          iso2,
          nTotal,
          nAvailable,
          nUnavailable,
          kinds.map((k) => ({
            specialty: k.specialty,
            n: num(k.n_total),
            n_total: num(k.n_total),
            n_available: num(k.n_available),
            n_unavailable: num(k.n_unavailable),
          })),
          sess.cap,
          sess.entitlement,
        ),
      )
    }

    const totals = await bqQuery<{ n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
      `SELECT n_total, n_available, n_unavailable
       FROM ${table("country_daily_latest")}
       WHERE country_iso2 = @cc LIMIT 1`,
      { cc: iso2 },
    )
    const kinds = await bqQuery<{ specialty: string; n_total: unknown; n_available: unknown; n_unavailable: unknown }>(
      `SELECT specialty, n_total, n_available, n_unavailable
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
                COUNTIF(j.availability = 'available') AS n_available,
                COUNTIF(j.availability = 'probably_unavailable') AS n_unavailable
         FROM ${table("job_offers_country")} j
         JOIN ${table("job_offer_boards")} b ON b.job_key = j.job_key AND b.is_master
         WHERE j.country_iso2 = @cc`,
        { cc: iso2 },
      )
      nTotal = num(fallback[0]?.n_total)
      return NextResponse.json(
        body(
          iso2,
          nTotal,
          num(fallback[0]?.n_available),
          num(fallback[0]?.n_unavailable),
          kinds.map((k) => ({
            specialty: k.specialty,
            n: num(k.n_total),
            n_total: num(k.n_total),
            n_available: num(k.n_available),
            n_unavailable: num(k.n_unavailable),
          })),
          sess.cap,
          sess.entitlement,
        ),
      )
    }
    return NextResponse.json(
      body(
        iso2,
        nTotal,
        num(t?.n_available),
        num(t?.n_unavailable),
        kinds.map((k) => ({
          specialty: k.specialty,
          n: num(k.n_total),
          n_total: num(k.n_total),
          n_available: num(k.n_available),
          n_unavailable: num(k.n_unavailable),
        })),
        sess.cap,
        sess.entitlement,
      ),
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ iso2, n_total: 0, kinds: [], entitlement: sess.entitlement })
  }
}
