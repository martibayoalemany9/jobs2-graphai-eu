import { bqQuery, table } from "./bq"

export type JobComm = {
  reply_product: string
  info_note?: string | null
}

export async function loadCommsByJobKeys(keys: string[]): Promise<Map<string, JobComm>> {
  const out = new Map<string, JobComm>()
  if (!keys.length) return out
  try {
    const rows = await bqQuery<{ job_key: string; reply_product: string; info_note: string }>(
      `SELECT job_key, reply_product, info_note
       FROM ${table("job_offer_comms")}
       WHERE job_key IN UNNEST(@keys)
         AND applied IS TRUE
         AND NULLIF(TRIM(reply_product), "") IS NOT NULL`,
      { keys },
    )
    for (const r of rows) {
      if (!r.job_key || !r.reply_product) continue
      out.set(r.job_key, {
        reply_product: String(r.reply_product),
        info_note: r.info_note || null,
      })
    }
  } catch {
    return out
  }
  return out
}
