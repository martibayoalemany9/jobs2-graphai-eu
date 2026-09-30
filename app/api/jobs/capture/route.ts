import { NextResponse } from "next/server"
import { bqQuery, table, projectId } from "@/lib/bq"
import { parseCapturedOffer, sha256Hex } from "@/lib/capture-offer"
import { sessionCap } from "@/lib/session-entitlement"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const HARVEST = `\`${projectId()}.apply_jobs.job_offers\``
const HARVEST_SHOTS = `\`${projectId()}.apply_jobs.job_offer_screenshots\``
const MAX_BYTES = 4_000_000

type Body = {
  image_base64?: string
  mime_type?: string
  ocr_text?: string
  job_url?: string
  width?: number
  height?: number
}

function decodeImage(raw: string): Buffer | null {
  const s = String(raw || "").replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "")
  if (!s) return null
  try {
    const buf = Buffer.from(s, "base64")
    return buf.length ? buf : null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const sess = await sessionCap()
  if (!sess.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const tier = sess.entitlement.tier
  if (tier === "anonymous") return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Body
  const png = decodeImage(body.image_base64 || "")
  if (!png) return NextResponse.json({ error: "image_base64 required" }, { status: 400 })
  if (png.length > MAX_BYTES) return NextResponse.json({ error: "image too large" }, { status: 413 })

  const sha = sha256Hex(png)
  const ocr = String(body.ocr_text || "")
  const offer = parseCapturedOffer(ocr, sha, body.job_url)
  const screenshotId = sha.slice(0, 32)
  const mime = String(body.mime_type || "image/png").slice(0, 40)
  const width = Number(body.width || 0) || null
  const height = Number(body.height || 0) || null

  const shotParams = {
    sid: screenshotId,
    uid: sess.userId,
    email: sess.email || "",
    job_url: offer.job_url,
    url_norm: offer.url_norm,
    title: offer.title,
    company: offer.company,
    loc: offer.job_location,
    country: offer.country_iso2,
    ocr,
    png,
    sha,
    width,
    height,
    mime,
  }
  const shotTypes = { png: "BYTES" }

  const shotSql = (tbl: string) => `
INSERT INTO ${tbl}
  (screenshot_id, captured_at, clerk_user_id, clerk_email, job_url, url_norm,
   title, company, job_location, country, ocr_text, image_png, image_sha256,
   image_width, image_height, mime_type, ingest_status)
SELECT @sid, CURRENT_TIMESTAMP(), @uid, @email, @job_url, @url_norm,
       @title, @company, @loc, @country, @ocr, @png, @sha,
       @width, @height, @mime, "stored"
WHERE NOT EXISTS (
  SELECT 1 FROM ${tbl} t WHERE t.screenshot_id = @sid OR t.image_sha256 = @sha
)`

  let screenshotStored = false
  for (const tbl of [table("job_offer_screenshots"), HARVEST_SHOTS]) {
    try {
      await bqQuery(shotSql(tbl), shotParams, shotTypes)
      screenshotStored = true
    } catch (err) {
      console.error("screenshot insert", tbl, (err as Error).message)
    }
  }
  if (!screenshotStored) {
    return NextResponse.json({ error: "could not store screenshot" }, { status: 502 })
  }

  let harvestInserted = false
  try {
    const merge = await bqQuery<{ inserted?: unknown }>(
      `MERGE ${HARVEST} T
       USING (SELECT @url AS url) S
       ON LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(T.url,"")), r"[?#].*$", ""), r"/+$", ""))
        = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(S.url,"")), r"[?#].*$", ""), r"/+$", ""))
       WHEN NOT MATCHED THEN INSERT
         (company, title, job_location, headquarters_location, is_remote, country, url, appeared_at, source, description)
       VALUES
         (@company, @title, @loc, @loc, @remote, @country, @url, FORMAT_TIMESTAMP("%Y-%m-%dT%H:%M:%SZ", CURRENT_TIMESTAMP()), "jobs2_screenshot", @desc)`,
      {
        url: offer.job_url,
        company: offer.company,
        title: offer.title,
        loc: offer.job_location,
        remote: offer.is_remote,
        country: offer.country_iso2,
        desc: offer.description,
      },
    )
    harvestInserted = true
    void merge
  } catch (err) {
    console.error("harvest merge", (err as Error).message)
  }

  let servingInserted = false
  try {
    await bqQuery(
      `INSERT INTO ${table("job_offers_country")}
        (job_key, url, url_norm, company, title, job_location, headquarters_location,
         is_remote, country_raw, country_iso2, appeared_at, appeared_at_ts, source,
         description_excerpt, description_len, specialties, public_rank, availability, ingested_at)
       SELECT
         @job_key, @url, @url_norm, @company, @title, @loc, @loc,
         @remote, @country, @country, FORMAT_TIMESTAMP("%Y-%m-%dT%H:%M:%SZ", CURRENT_TIMESTAMP()),
         CURRENT_TIMESTAMP(), "jobs2_screenshot",
         SUBSTR(@desc, 1, 1200), LENGTH(@desc), @sp,
         (SELECT COALESCE(MAX(public_rank), 0) FROM ${table("job_offers_country")} WHERE country_iso2 = @country) + 1,
         "available", CURRENT_TIMESTAMP()
       FROM (SELECT 1)
       WHERE NOT EXISTS (
         SELECT 1 FROM ${table("job_offers_country")} e WHERE e.url_norm = @url_norm
       )`,
      {
        job_key: offer.job_key,
        url: offer.job_url,
        url_norm: offer.url_norm,
        company: offer.company,
        title: offer.title,
        loc: offer.job_location,
        remote: offer.is_remote,
        country: offer.country_iso2,
        desc: offer.description,
        sp: offer.specialties,
      },
    )
    servingInserted = true
  } catch (err) {
    console.error("serving insert", (err as Error).message)
  }

  if (servingInserted) {
    try {
      await bqQuery(
        `INSERT INTO ${table("job_offer_boards")}
          (job_key, group_id, master_job_key, is_master, member_rank, master_rank,
           board_id, source, url, country_iso2)
         SELECT @job_key, @job_key, @job_key, TRUE, 1,
           (SELECT COALESCE(MAX(master_rank), 0) FROM ${table("job_offer_boards")} WHERE country_iso2 = @country) + 1,
           "jobs2_screenshot", "jobs2_screenshot", @url, @country
         FROM (SELECT 1)
         WHERE NOT EXISTS (
           SELECT 1 FROM ${table("job_offer_boards")} b WHERE b.job_key = @job_key
         )`,
        { job_key: offer.job_key, url: offer.job_url, country: offer.country_iso2 },
      )
    } catch (err) {
      console.error("boards insert", (err as Error).message)
    }
  }

  return NextResponse.json({
    ok: true,
    screenshot_id: screenshotId,
    job_key: offer.job_key,
    job_url: offer.job_url,
    title: offer.title,
    company: offer.company,
    job_location: offer.job_location,
    country_iso2: offer.country_iso2,
    specialties: offer.specialties,
    synthesized_url: offer.synthesized_url,
    harvest_inserted: harvestInserted,
    serving_inserted: servingInserted,
  })
}
