import { NextResponse } from "next/server"
import { bqQuery } from "@/lib/bq"
import { clusterById } from "@/lib/skills-catalog"
import { catalogRowMatchesSkill, skillTagById } from "@/lib/skill-tags"

export const revalidate = 300

export async function GET(req: Request) {
  const url = new URL(req.url)
  const cluster = url.searchParams.get("cluster") || ""
  const skill = url.searchParams.get("skill") || ""
  const sk = clusterById(cluster)
  const tag = skillTagById(skill)
  try {
    const rows = await bqQuery<{
      cert_id: string
      certification_name: string
      provider: string
      certification_url: string
      skill_regex: string
      mention_regex: string
    }>(
      `SELECT cert_id, certification_name, provider, certification_url, skill_regex, mention_regex
       FROM \`poetic-sentinel-402405.apply_jobs.certification_catalog\`
       ORDER BY certification_name`,
    )
    const certs = rows.filter((r) => {
      if (tag) return catalogRowMatchesSkill(r, tag.id)
      if (!sk) return true
      const hay = `${r.skill_regex || ""} ${r.mention_regex || ""} ${r.certification_name || ""} ${r.provider || ""}`.toLowerCase()
      return sk.names.some((n) => hay.includes(n.toLowerCase()))
    })
    return NextResponse.json({ cluster: cluster || "all", skill: skill || null, certs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ cluster: cluster || "all", skill: skill || null, certs: [] })
  }
}
