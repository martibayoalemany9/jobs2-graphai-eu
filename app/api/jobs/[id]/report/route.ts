import { NextResponse } from "next/server"
import { bqQuery, getBigQuery, datasetId, table } from "@/lib/bq"
import { parseCatalogLocale } from "@/lib/locales"

export const dynamic = "force-dynamic"

const REPORT_MAIL = "hello@graphai.eu"
const JOB_KEY_RE = /^[A-Za-z0-9_-]{16,40}$/

function mailtoHref(opts: {
  kind: "deletion" | "correction"
  jobKey: string
  title?: string
  company?: string
  message: string
  contact: string
  locale: string
  url?: string
}) {
  const subject =
    opts.kind === "deletion"
      ? `Job offer deletion request ${opts.jobKey}`
      : `Job offer correction request ${opts.jobKey}`
  const body = [
    `Kind: ${opts.kind}`,
    `Job key: ${opts.jobKey}`,
    opts.url ? `URL: ${opts.url}` : "",
    opts.title ? `Title: ${opts.title}` : "",
    opts.company ? `Company: ${opts.company}` : "",
    `Locale: ${opts.locale}`,
    opts.contact ? `Contact: ${opts.contact}` : "",
    "",
    opts.message || "(no details)",
  ]
    .filter((line) => line !== "")
    .join("\n")
  return `mailto:${REPORT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const jobKey = String(id || "")
  if (!JOB_KEY_RE.test(jobKey)) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string
    message?: string
    contact?: string
    locale?: string
    title?: string
    company?: string
  }
  const kind = body.kind === "deletion" ? "deletion" : "correction"
  const message = String(body.message || "").slice(0, 4000)
  const contact = String(body.contact || "").slice(0, 200)
  const locale = parseCatalogLocale(body.locale)
  const titleIn = String(body.title || "").slice(0, 400)
  const companyIn = String(body.company || "").slice(0, 200)

  let jobUrl = ""
  let title = titleIn
  let company = companyIn
  try {
    const rows = await bqQuery<{ url: string; title: string; company: string }>(
      `SELECT url, title, company FROM ${table("job_offers_country")} WHERE job_key = @id LIMIT 1`,
      { id: jobKey },
    )
    if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 })
    jobUrl = rows[0].url || ""
    title = title || rows[0].title || ""
    company = company || rows[0].company || ""
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  let stored = false
  try {
    await getBigQuery()
      .dataset(datasetId())
      .table("job_offer_correction_requests")
      .insert([
        {
          requested_at: new Date().toISOString(),
          job_key: jobKey,
          job_url: jobUrl,
          title,
          company,
          kind,
          message,
          contact_email: contact,
          locale,
          user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
          notified: false,
        },
      ])
    stored = true
  } catch (err) {
    console.error("correction request insert", err)
  }

  const mailto = mailtoHref({
    kind,
    jobKey,
    title,
    company,
    message,
    contact,
    locale,
    url: jobUrl,
  })
  return NextResponse.json({
    ok: true,
    stored,
    mailto,
    notify: REPORT_MAIL,
  })
}
