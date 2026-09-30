import { bqQuery, table } from "./bq"

export type JobSkillRow = { skill_id: string; skill_label: string }

/** Load skill tags for a page of job_keys. Separate query — BQ rejects correlated ARRAY subqueries here. */
export async function loadSkillsByJobKeys(keys: string[], perJob = 12): Promise<Map<string, JobSkillRow[]>> {
  const out = new Map<string, JobSkillRow[]>()
  if (!keys.length) return out
  try {
    const rows = await bqQuery<{ job_key: string; skill_id: string; skill_label: string }>(
      `SELECT job_key, skill_id, skill_label
       FROM ${table("job_offer_skills")}
       WHERE job_key IN UNNEST(@keys)
       ORDER BY skill_id`,
      { keys },
    )
    for (const r of rows) {
      const arr = out.get(r.job_key) || []
      if (arr.length >= perJob) continue
      arr.push({ skill_id: r.skill_id, skill_label: r.skill_label })
      out.set(r.job_key, arr)
    }
  } catch (err) {
    console.error(err)
  }
  return out
}
