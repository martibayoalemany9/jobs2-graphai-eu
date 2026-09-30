import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { catalogLocaleFromRequest, jobTranslationJoin, TRANSLATED_EXCERPT_SQL, TRANSLATED_TITLE_SQL } from "@/lib/job-i18n"
import { sessionCap } from "@/lib/session-entitlement"
import { formatLocationLine, isRemoteFlag, resolveJobLocation } from "@/lib/location"
import { loadSkillsByJobKeys } from "@/lib/job-skills"
import { loadBoardsByMasterKeys, lookupBoardLink, masterBoardsJoin, masterCapSql } from "@/lib/load-job-boards"

export const dynamic = "force-dynamic"

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const jobKey = String(id || "")
  if (!jobKey || jobKey.length < 8) return NextResponse.json({ error: "not found" }, { status: 404 })
  const locale = catalogLocaleFromRequest(req)
  const sess = await sessionCap()
  const cap = sess.cap
  const capSql = masterCapSql(cap)
  try {
    const link = await lookupBoardLink(jobKey)
    const masterId = link?.master_job_key || jobKey
    const jobs = await bqQuery<{
      job_key: string
      url: string
      title: string
      company: string
      country_iso2: string
      job_location: string
      headquarters_location: string
      is_remote: string
      appeared_at: string
      availability: string
      description_excerpt: string
      description_len: unknown
      specialties: string[]
      public_rank: unknown
    }>(
      `SELECT j.job_key, j.url, ${TRANSLATED_TITLE_SQL}, j.company, j.country_iso2, j.job_location, j.headquarters_location, j.is_remote,
              j.appeared_at, j.availability, ${TRANSLATED_EXCERPT_SQL}, j.description_len, j.specialties, j.public_rank
       FROM ${table("job_offers_country")} j
       ${masterBoardsJoin()}
       ${jobTranslationJoin()}
       WHERE j.job_key = @id ${capSql}
       LIMIT 1`,
      cap == null ? { id: masterId, locale } : { id: masterId, cap, locale },
    )
    const job = jobs[0]
    if (!job) return NextResponse.json({ error: "not found" }, { status: 404 })

    const paidFull = sess.cap == null && !sess.freeMode
    let description = job.description_excerpt
    if (paidFull) {
      const d = await bqQuery<{ description: string }>(
        `SELECT description FROM ${table("job_descriptions")} WHERE job_key = @id LIMIT 1`,
        { id: masterId },
      )
      if (d[0]?.description) description = d[0].description
    }

    const [certs, skillsByJob, boardsByJob] = await Promise.all([
      bqQuery<Record<string, string>>(
        `SELECT certification_name, provider, certification_url, match_kind, cert_id
         FROM ${table("job_offer_certs")} WHERE job_key = @id LIMIT 24`,
        { id: masterId },
      ),
      loadSkillsByJobKeys([job.job_key], 16),
      loadBoardsByMasterKeys([job.job_key]),
    ])
    const boards = boardsByJob.get(job.job_key) || []
    const selectedBoard = link?.board_id || boards.find((b) => b.is_master)?.board_id || null
    const selectedIsMaster = !link || link.is_master || selectedBoard === boards.find((b) => b.is_master)?.board_id
    const conferences = await bqQuery<Record<string, unknown>>(
      `SELECT conference_name, organizer, conference_url, location, start_date, end_date, relation
       FROM ${table("job_offer_conferences")} WHERE job_key = @id LIMIT 12`,
      { id: masterId },
    )
    const talks = await bqQuery<Record<string, unknown>>(
      `SELECT conference_name, talk_title, talk_url, speakers, talk_type, score
       FROM ${table("job_offer_talks")} WHERE job_key = @id
       ORDER BY score DESC LIMIT 3`,
      { id: masterId },
    )
    let learn: { name: string; uri: string; provider: string; level: string }[] = []
    if (certs.length) {
      try {
        const sp = (job.specialties || []).filter((s) => s && s !== "uncategorized").slice(0, 4)
        if (sp.length) {
          learn = await bqQuery(
            `SELECT name, uri, provider, level
             FROM ${table("skill_certs_imported")}
             WHERE skill_id IN UNNEST(@sp)
             LIMIT 12`,
            { sp },
          )
        }
      } catch {
        learn = []
      }
    }

    const loc = resolveJobLocation({
      jobLocation: job.job_location,
      title: job.title,
      company: job.company,
      isRemote: job.is_remote,
      headquarters: job.headquarters_location,
      countryIso2: job.country_iso2,
    })
    return NextResponse.json({
      job: {
        ...job,
        description,
        description_len: num(job.description_len),
        public_rank: num(job.public_rank),
        full_description: paidFull,
        job_location: loc.location,
        display_location: formatLocationLine({ ...loc, remote: isRemoteFlag(job.is_remote, job.title) }),
        used_headquarters: loc.usedHeadquarters,
        headquarters_location: loc.headquarters,
        skills: skillsByJob.get(job.job_key) || [],
        boards,
        selected_board: selectedBoard,
        selected_is_master: selectedIsMaster,
      },
      certs,
      conferences,
      talks,
      learn,
      entitlement: sess.entitlement,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
}
