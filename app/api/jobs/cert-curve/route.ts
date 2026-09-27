import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { isIso2 } from "@/lib/country"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const country = String(url.searchParams.get("country") || "").toUpperCase()
  if (!isIso2(country)) return NextResponse.json({ error: "country required" }, { status: 400 })
  const specialties = (url.searchParams.get("specialties") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const certs = (url.searchParams.get("certs") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const sess = await sessionCap()
  const cap = sess.cap
  const specSql =
    specialties.length === 0
      ? ""
      : "AND EXISTS (SELECT 1 FROM UNNEST(j.specialties) s WHERE s IN UNNEST(@sp))"
  const capSql = cap == null ? "" : "AND j.public_rank <= @cap"

  try {
    const points: { k: number; cert_id: string | null; n: number }[] = []
    const base = await bqQuery<{ n: unknown }>(
      `SELECT COUNT(*) AS n FROM ${table("job_offers_country")} j
       WHERE j.country_iso2 = @cc ${capSql} ${specSql}`,
      { cc: country, cap, sp: specialties },
    )
    points.push({ k: 0, cert_id: null, n: num(base[0]?.n) })
    for (let k = 1; k <= certs.length; k++) {
      const prefix = certs.slice(0, k)
      const row = await bqQuery<{ n: unknown }>(
        `SELECT COUNT(*) AS n FROM (
           SELECT c.job_key
           FROM ${table("job_offer_certs")} c
           JOIN ${table("job_offers_country")} j ON j.job_key = c.job_key
           WHERE c.country_iso2 = @cc AND j.country_iso2 = @cc
             ${capSql}
             ${specSql}
             AND c.cert_id IN UNNEST(@certs)
           GROUP BY c.job_key
           HAVING COUNT(DISTINCT c.cert_id) = ARRAY_LENGTH(@certs)
         )`,
        { cc: country, cap, sp: specialties, certs: prefix },
      )
      points.push({ k, cert_id: prefix[k - 1], n: num(row[0]?.n) })
    }
    const emptyState = !sess.userId && points.slice(1).every((p) => p.n === 0)
    return NextResponse.json({
      points,
      empty_state: emptyState,
      empty_copy: emptyState ? "Sign in to score certifications on the full set" : null,
      entitlement: sess.entitlement,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ points: [{ k: 0, cert_id: null, n: 0 }], entitlement: sess.entitlement })
  }
}
