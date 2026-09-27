import { NextResponse } from "next/server"
import { bqQuery, table } from "@/lib/bq"
import { clusterById } from "@/lib/skills-catalog"

export const revalidate = 300

export async function GET(req: Request) {
  const cluster = new URL(req.url).searchParams.get("cluster") || ""
  const sk = clusterById(cluster)
  try {
    const rows = await bqQuery<{
      cert_id: string
      certification_name: string
      provider: string
      certification_url: string
      skill_regex: string
    }>(
      `SELECT cert_id, certification_name, provider, certification_url, skill_regex
       FROM \`poetic-sentinel-402405.apply_jobs.certification_catalog\`
       ORDER BY certification_name`,
    )
    const certs = rows.filter((r) => {
      if (!sk) return true
      const hay = `${r.skill_regex || ""} ${r.certification_name || ""} ${r.provider || ""}`.toLowerCase()
      return sk.names.some((n) => hay.includes(n.toLowerCase()))
    })
    return NextResponse.json({ cluster: cluster || "all", certs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ cluster: cluster || "all", certs: [] })
  }
}
