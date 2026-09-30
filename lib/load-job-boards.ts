import { bqQuery, num, table } from "./bq"
import { uniqueBoards, type JobBoardMember } from "./job-boards"

export function masterBoardsJoin(): string {
  return `JOIN ${table("job_offer_boards")} b ON b.job_key = j.job_key AND b.is_master`
}

export function masterCapSql(cap: number | null): string {
  return cap == null ? "" : "AND b.master_rank <= @cap"
}

type Row = {
  job_key: string
  master_job_key: string
  is_master: boolean
  member_rank: unknown
  board_id: string
  source: string
  url: string
}

function asMember(r: Row): JobBoardMember {
  return {
    job_key: r.job_key,
    master_job_key: r.master_job_key,
    is_master: Boolean(r.is_master),
    member_rank: num(r.member_rank) || 0,
    board_id: r.board_id || "other",
    source: r.source || "",
    url: r.url || "",
  }
}

/** Load origin boards for a page of master job_keys. */
export async function loadBoardsByMasterKeys(keys: string[]): Promise<Map<string, JobBoardMember[]>> {
  const out = new Map<string, JobBoardMember[]>()
  if (!keys.length) return out
  try {
    const rows = await bqQuery<Row>(
      `SELECT job_key, master_job_key, is_master, member_rank, board_id, source, url
       FROM ${table("job_offer_boards")}
       WHERE master_job_key IN UNNEST(@keys)
       ORDER BY member_rank, board_id`,
      { keys },
    )
    const grouped = new Map<string, JobBoardMember[]>()
    for (const r of rows) {
      const arr = grouped.get(r.master_job_key) || []
      arr.push(asMember(r))
      grouped.set(r.master_job_key, arr)
    }
    for (const [k, arr] of grouped) out.set(k, uniqueBoards(arr))
  } catch (err) {
    console.error(err)
  }
  return out
}

export async function lookupBoardLink(jobKey: string): Promise<JobBoardMember | null> {
  try {
    const rows = await bqQuery<Row>(
      `SELECT job_key, master_job_key, is_master, member_rank, board_id, source, url
       FROM ${table("job_offer_boards")}
       WHERE job_key = @id
       LIMIT 1`,
      { id: jobKey },
    )
    return rows[0] ? asMember(rows[0]) : null
  } catch (err) {
    console.error(err)
    return null
  }
}
