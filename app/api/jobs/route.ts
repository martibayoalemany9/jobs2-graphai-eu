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
  const availability = url.searchParams.get("availability") || "all"
  const cursor = url.searchParams.get("cursor") || ""
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)))
  const sess = await sessionCap()
  const cap = sess.cap

  const availSql =
    availability === "available"
      ? "AND j.availability = 'available'"
      : availability === "probably_unavailable"
        ? "AND j.availability = 'probably_unavailable'"
        : ""

  const specSql =
    specialties.length === 0
      ? ""
      : "AND EXISTS (SELECT 1 FROM UNNEST(j.specialties) s WHERE s IN UNNEST(@sp))"

  const certJoin =
    certs.length === 0
      ? ""
      : `AND j.job_key IN (
           SELECT c.job_key FROM ${table("job_offer_certs")} c
           WHERE c.country_iso2 = @cc AND c.cert_id IN UNNEST(@certs)
           GROUP BY c.job_key
           HAVING COUNT(DISTINCT c.cert_id) = ARRAY_LENGTH(@certs)
         )`

  const capSql = cap == null ? "" : "AND j.public_rank <= @cap"
  const cursorSql = cursor ? "AND j.job_key > @cursor" : ""

  const params: Record<string, unknown> = { cc: country, limit }
  if (cap != null) params.cap = cap
  if (specialties.length) params.sp = specialties
  if (certs.length) params.certs = certs
  if (cursor) params.cursor = cursor

  try {
    const rows = await bqQuery<{
      job_key: string
      title: string
      company: string
      country_iso2: string
      job_location: string
      is_remote: string
      public_rank: unknown
      availability: string
      description_excerpt: string
      specialties: string[]
    }>(
      `SELECT j.job_key, j.title, j.company, j.country_iso2, j.job_location, j.is_remote,
              j.public_rank, j.availability, j.description_excerpt, j.specialties
       FROM ${table("job_offers_country")} j
       WHERE j.country_iso2 = @cc
         ${capSql}
         ${availSql}
         ${specSql}
         ${certJoin}
         ${cursorSql}
       ORDER BY j.job_key
       LIMIT @limit`,
      params,
    )
    return NextResponse.json({
      jobs: rows.map((r) => ({ ...r, public_rank: num(r.public_rank) })),
      entitlement: { ...sess.entitlement, truncated: cap != null },
      next_cursor: rows.length === limit ? rows[rows.length - 1].job_key : null,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ jobs: [], entitlement: sess.entitlement, next_cursor: null })
  }
}
