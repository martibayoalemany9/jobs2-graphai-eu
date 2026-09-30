import { createHash } from "node:crypto"
import { COUNTRY_NAME_MAP, TLD_COUNTRY } from "./country"
import { foldText } from "./fold"
import { jobKeyFromNorm, urlNorm } from "./job-key"
import { extractSpecialties } from "./skills-catalog"

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi
const JOB_URL_HINT =
  /job|career|stellen|vacancy|vacatures|offre|greenhouse|lever\.co|personio|smartrecruiters|workday|taleo|icims|ashby/i
const COMPANY_HINT =
  /\b(gmbh|ag\b|se\b|ltd|limited|inc\b|llc|s\.?a\.?|oy\b|bv\b|nv\b|kg\b|ug\b|oü|ou\b|sarl|plc|corp|company|group)\b/i

export type CapturedOffer = {
  job_url: string
  url_norm: string
  job_key: string
  title: string
  company: string
  job_location: string
  country: string
  country_iso2: string
  is_remote: string
  description: string
  specialties: string[]
  synthesized_url: boolean
}

export function extractUrls(text: string): string[] {
  const found = String(text || "").match(URL_RE) || []
  const cleaned = found
    .map((u) => u.replace(/[.,;:]+$/, ""))
    .filter((u) => /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(u))
  const uniq: string[] = []
  const seen = new Set<string>()
  for (const u of cleaned) {
    const k = urlNorm(u)
    if (!k || seen.has(k)) continue
    seen.add(k)
    uniq.push(u)
  }
  uniq.sort((a, b) => Number(JOB_URL_HINT.test(b)) - Number(JOB_URL_HINT.test(a)))
  return uniq
}

function firstTitle(lines: string[]): string {
  for (const line of lines) {
    if (URL_RE.test(line)) continue
    const t = line.replace(/\s+/g, " ").trim()
    if (t.length < 6 || t.length > 180) continue
    if (/^(apply|bewerben|cookie|privacy|login|sign in|menu)$/i.test(t)) continue
    return t
  }
  return ""
}

function guessCompany(lines: string[], title: string): string {
  for (const line of lines) {
    if (line === title) continue
    if (COMPANY_HINT.test(line) && line.length < 120) return line.replace(/\s+/g, " ").trim()
  }
  const at = title.match(/\bat\s+([^|·•\-]{3,80})$/i)
  if (at) return at[1].trim()
  return ""
}

function guessLocation(text: string): string {
  const folded = foldText(text)
  if (/\b(remote|homeoffice|home office|telecommute|wfh)\b/.test(folded)) return "Remote"
  for (const [name, iso] of Object.entries(COUNTRY_NAME_MAP)) {
    if (iso && folded.includes(name)) {
      return name.replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }
  const city = text.match(
    /\b(Berlin|Hamburg|Munich|München|Frankfurt|Stuttgart|Amsterdam|Rotterdam|Prague|Praha|Paris|London|Vienna|Wien|Zurich|Zürich|Brussels|Dublin|Muscat|Honolulu)\b/,
  )
  return city ? city[1] : ""
}

function nameInHay(hay: string, name: string): boolean {
  if (!name) return false
  if (name.length <= 3) {
    return new RegExp(`(?:^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`).test(hay)
  }
  return hay.includes(name)
}

function countryIso2(jobUrl: string, location: string, text: string): { iso2: string; raw: string } {
  const locFold = foldText(location)
  if (COUNTRY_NAME_MAP[locFold]) return { iso2: COUNTRY_NAME_MAP[locFold], raw: location }
  const hay = foldText(`${location} ${text}`)
  const names = Object.entries(COUNTRY_NAME_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [name, iso] of names) {
    if (nameInHay(hay, name)) return { iso2: iso, raw: name }
  }
  try {
    const host = new URL(jobUrl).hostname
    const tld = host.split(".").pop() || ""
    if (TLD_COUNTRY[tld]) return { iso2: TLD_COUNTRY[tld], raw: TLD_COUNTRY[tld] }
  } catch {
    /* ignore */
  }
  return { iso2: "ZZ", raw: location || "unknown" }
}

export function parseCapturedOffer(ocrText: string, imageSha256: string, hintedUrl?: string): CapturedOffer {
  const text = String(ocrText || "").replace(/\u0000/g, " ")
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const urls = extractUrls(text)
  const hinted = String(hintedUrl || "").trim()
  let jobUrl = hinted && /^https?:\/\//i.test(hinted) ? hinted : urls[0] || ""
  let synthesized = false
  if (!jobUrl) {
    jobUrl = `https://jobs2.graphai.eu/capture/${imageSha256.slice(0, 32)}`
    synthesized = true
  }
  const title = firstTitle(lines) || "Captured job offer"
  const company = guessCompany(lines, title)
  const job_location = guessLocation(text)
  const country = countryIso2(jobUrl, job_location, text)
  const description = text.slice(0, 4000)
  const specialties = extractSpecialties(`${title} ${description}`)
  const remote = /\b(remote|homeoffice|home office|wfh|telecommute)\b/i.test(text)
  const norm = urlNorm(jobUrl)
  return {
    job_url: jobUrl,
    url_norm: norm,
    job_key: jobKeyFromNorm(norm),
    title,
    company,
    job_location: job_location || country.raw,
    country: country.iso2,
    country_iso2: country.iso2,
    is_remote: remote ? "true" : "false",
    description,
    specialties,
    synthesized_url: synthesized,
  }
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex")
}
