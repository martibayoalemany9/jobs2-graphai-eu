import { NextResponse } from "next/server"
import { bqQuery, num, table } from "@/lib/bq"
import { sessionCap } from "@/lib/session-entitlement"
import { loadBoardsByMasterKeys, lookupBoardLink } from "@/lib/load-job-boards"
import { stripHtml } from "@/lib/text-diff"
import type { JobBoardMember } from "@/lib/job-boards"

export const dynamic = "force-dynamic"

type TextRow = {
  job_key: string
  title: string
  company: string
  url: string
  description_excerpt: string
}

async function loadText(jobKey: string, paidFull: boolean): Promise<{ title: string; company: string; url: string; text: string } | null> {
  const jobs = await bqQuery<TextRow>(
    `SELECT j.job_key, j.title, j.company, j.url, j.description_excerpt
     FROM ${table("job_offers_country")} j
     WHERE j.job_key = @id
     LIMIT 1`,
    { id: jobKey },
  )
  const job = jobs[0]
  if (!job) return null
  let text = job.description_excerpt || ""
  if (paidFull) {
    const d = await bqQuery<{ description: string }>(
      `SELECT description FROM ${table("job_descriptions")} WHERE job_key = @id LIMIT 1`,
      { id: jobKey },
    )
    if (d[0]?.description) text = d[0].description
  }
  return {
    title: job.title,
    company: job.company,
    url: job.url,
    text: stripHtml(text),
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const jobKey = String(id || "")
  if (!jobKey || jobKey.length < 8) return NextResponse.json({ error: "not found" }, { status: 404 })
  const url = new URL(req.url)
  const board = String(url.searchParams.get("board") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
  const sess = await sessionCap()
  const cap = sess.cap
  const paidFull = sess.cap == null && !sess.freeMode

  try {
    const link = await lookupBoardLink(jobKey)
    const masterId = link?.master_job_key || jobKey
    const boards = (await loadBoardsByMasterKeys([masterId])).get(masterId) || []
    if (!boards.length) return NextResponse.json({ error: "not found" }, { status: 404 })

    const masterBoard = boards.find((b) => b.is_master) || boards[0]
    if (cap != null) {
      const ranks = await bqQuery<{ master_rank: unknown }>(
        `SELECT master_rank FROM ${table("job_offer_boards")} WHERE job_key = @id AND is_master LIMIT 1`,
        { id: masterId },
      )
      const rank = num(ranks[0]?.master_rank)
      if (!rank || rank > cap) return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    let selected: JobBoardMember = masterBoard
    if (board) {
      selected = boards.find((b) => b.board_id === board) || masterBoard
    } else if (link && !link.is_master) {
      selected = boards.find((b) => b.board_id === link.board_id) || masterBoard
    }

    const [masterText, selectedText] = await Promise.all([
      loadText(masterBoard.job_key, paidFull),
      selected.job_key === masterBoard.job_key ? Promise.resolve(null) : loadText(selected.job_key, paidFull),
    ])
    if (!masterText) return NextResponse.json({ error: "not found" }, { status: 404 })
    const sel = selectedText || masterText

    return NextResponse.json({
      master: {
        job_key: masterBoard.job_key,
        board_id: masterBoard.board_id,
        title: masterText.title,
        company: masterText.company,
        url: masterText.url,
        text: masterText.text,
      },
      selected: {
        job_key: selected.job_key,
        board_id: selected.board_id,
        is_master: selected.job_key === masterBoard.job_key,
        title: sel.title,
        company: sel.company,
        url: sel.url,
        text: sel.text,
      },
      boards,
      full_description: paidFull,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
}
