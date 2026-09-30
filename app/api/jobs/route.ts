import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { availabilitySql, parseAvailability } from "@/lib/availability"
import { parseCountryScope } from "@/lib/country"
import { catalogLocaleFromRequest, jobTranslationJoin, TRANSLATED_EXCERPT_SQL, TRANSLATED_TITLE_SQL } from "@/lib/job-i18n"
import { sessionCap } from "@/lib/session-entitlement"
import { formatLocationLine, isRemoteFlag, resolveJobLocation } from "@/lib/location"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const scope = parseCountryScope(String(url.searchParams.get("country") || ""))
  if (!scope) return NextResponse.json({ error: "country required" }, { status: 400 })
  const specialties = (url.searchParams.get("specialties") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const certs = (url.searchParams.get("certs") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const availability = parseAvailability(url.searchParams.get("availability"))
  const locale = catalogLocaleFromRequest(url)
  const cursor = url.searchParams.get("cursor") || ""
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)))
  const sess = await sessionCap()
  const cap = sess.cap

  const availSql = availabilitySql("j", availability)

  const specSql =
    specialties.length === 0
      ? ""
      : "AND EXISTS (SELECT 1 FROM UNNEST(j.specialties) s WHERE s IN UNNEST(@sp))"

  const certCountrySql = scope.all ? "" : "AND c.country_iso2 = @cc"
  const certJoin =
    certs.length === 0
      ? ""
      : `AND j.job_key IN (
           SELECT c.job_key FROM ${table("job_offer_certs")} c
           WHERE c.cert_id IN UNNEST(@certs) ${certCountrySql}
           GROUP BY c.job_key
           HAVING COUNT(DISTINCT c.cert_id) = ARRAY_LENGTH(@certs)
         )`

  const capSql = cap == null ? "" : "AND j.public_rank <= @cap"
  const cursorSql = cursor ? "AND j.job_key > @cursor" : ""
  const countrySql = scope.all ? "TRUE" : "j.country_iso2 = @cc"

  const params: Record<string, unknown> = { limit, locale }
  if (!scope.all) params.cc = scope.iso2
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
      headquarters_location: string
      is_remote: string
      public_rank: unknown
      availability: string
      description_excerpt: string
      specialties: string[]
    }>(
      `SELECT j.job_key, ${TRANSLATED_TITLE_SQL}, j.company, j.country_iso2, j.job_location, j.headquarters_location, j.is_remote,
              j.public_rank, j.availability, ${TRANSLATED_EXCERPT_SQL}, j.specialties
       FROM ${table("job_offers_country")} j
       ${jobTranslationJoin()}
       WHERE ${countrySql}
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
      jobs: rows.map((r) => {
        const loc = resolveJobLocation({
          jobLocation: r.job_location,
          title: r.title,
          company: r.company,
          isRemote: r.is_remote,
          headquarters: r.headquarters_location,
          countryIso2: r.country_iso2,
        })
        return {
          ...r,
          public_rank: num(r.public_rank),
          job_location: loc.location,
          headquarters_location: loc.headquarters,
          display_location: formatLocationLine({ ...loc, remote: isRemoteFlag(r.is_remote, r.title) }),
          used_headquarters: loc.usedHeadquarters,
        }
      }),
      entitlement: { ...sess.entitlement, truncated: cap != null },
      next_cursor: rows.length === limit ? rows[rows.length - 1].job_key : null,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ jobs: [], entitlement: sess.entitlement, next_cursor: null })
  }
}
