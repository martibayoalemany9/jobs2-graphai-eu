import { L, localePick, type CatalogLocale } from "./locales"

/** Origin job-board (Jobbörse) for a serving offer. */
export type JobBoardMember = {
  job_key: string
  master_job_key: string
  is_master: boolean
  member_rank: number
  board_id: string
  source: string
  url: string
}

export type JobBoardMeta = {
  id: string
  letters: string
  bg: string
  fg: string
}

const FG = "#f4faf7"

const BOARDS: (JobBoardMeta & { label: ReturnType<typeof L> })[] = [
  { id: "arbeitsagentur", letters: "BA", bg: "#1b8f4a", fg: FG, label: L("Bundesagentur für Arbeit", "Bundesagentur für Arbeit", "Bundesagentur für Arbeit", "Bundesagentur für Arbeit", "Bundesagentur für Arbeit", "ドイツ連邦雇用庁", "Bundesagentur für Arbeit", "Bundesagentur für Arbeit") },
  { id: "eures", letters: "EU", bg: "#0a4ea3", fg: FG, label: L("EURES", "EURES", "EURES", "EURES", "EURES", "EURES", "EURES", "EURES") },
  { id: "mpsv", letters: "CZ", bg: "#c8102e", fg: FG, label: L("Úřad práce", "Úřad práce", "Úřad práce", "Úřad práce", "Úřad práce", "チェコ労働局", "Úřad práce", "Úřad práce") },
  { id: "reed", letters: "RE", bg: "#e11d2e", fg: FG, label: L("Reed", "Reed", "Reed", "Reed", "Reed", "Reed", "Reed", "Reed") },
  { id: "greenhouse", letters: "GH", bg: "#1d7a54", fg: FG, label: L("Greenhouse", "Greenhouse", "Greenhouse", "Greenhouse", "Greenhouse", "Greenhouse", "Greenhouse", "Greenhouse") },
  { id: "lever", letters: "LV", bg: "#4a3aff", fg: FG, label: L("Lever", "Lever", "Lever", "Lever", "Lever", "Lever", "Lever", "Lever") },
  { id: "smartrecruiters", letters: "SR", bg: "#0b67b3", fg: FG, label: L("SmartRecruiters", "SmartRecruiters", "SmartRecruiters", "SmartRecruiters", "SmartRecruiters", "SmartRecruiters", "SmartRecruiters", "SmartRecruiters") },
  { id: "himalayas", letters: "HI", bg: "#ff6b35", fg: FG, label: L("Himalayas", "Himalayas", "Himalayas", "Himalayas", "Himalayas", "Himalayas", "Himalayas", "Himalayas") },
  { id: "usajobs", letters: "US", bg: "#112e51", fg: FG, label: L("USAJOBS", "USAJOBS", "USAJOBS", "USAJOBS", "USAJOBS", "USAJOBS", "USAJOBS", "USAJOBS") },
  { id: "france_travail", letters: "FT", bg: "#000091", fg: FG, label: L("France Travail", "France Travail", "France Travail", "France Travail", "France Travail", "France Travail", "France Travail", "France Travail") },
  { id: "stepstone", letters: "ST", bg: "#0066cc", fg: FG, label: L("Stepstone", "Stepstone", "Stepstone", "Stepstone", "Stepstone", "Stepstone", "Stepstone", "Stepstone") },
  { id: "linkedin", letters: "IN", bg: "#0a66c2", fg: FG, label: L("LinkedIn", "LinkedIn", "LinkedIn", "LinkedIn", "LinkedIn", "LinkedIn", "LinkedIn", "LinkedIn") },
  { id: "indeed", letters: "ID", bg: "#2164f3", fg: FG, label: L("Indeed", "Indeed", "Indeed", "Indeed", "Indeed", "Indeed", "Indeed", "Indeed") },
  { id: "google", letters: "GO", bg: "#4285f4", fg: FG, label: L("Google", "Google", "Google", "Google", "Google", "Google", "Google", "Google") },
  { id: "arbeitnow", letters: "AN", bg: "#111111", fg: FG, label: L("Arbeitnow", "Arbeitnow", "Arbeitnow", "Arbeitnow", "Arbeitnow", "Arbeitnow", "Arbeitnow", "Arbeitnow") },
  { id: "jobicy", letters: "JC", bg: "#7c3aed", fg: FG, label: L("Jobicy", "Jobicy", "Jobicy", "Jobicy", "Jobicy", "Jobicy", "Jobicy", "Jobicy") },
  { id: "remoteok", letters: "RO", bg: "#ff4d00", fg: FG, label: L("Remote OK", "Remote OK", "Remote OK", "Remote OK", "Remote OK", "Remote OK", "Remote OK", "Remote OK") },
  { id: "devitjobs", letters: "DI", bg: "#0f172a", fg: FG, label: L("DevITJobs", "DevITJobs", "DevITJobs", "DevITJobs", "DevITJobs", "DevITJobs", "DevITJobs", "DevITJobs") },
  { id: "personio", letters: "PE", bg: "#1e3a5f", fg: FG, label: L("Personio", "Personio", "Personio", "Personio", "Personio", "Personio", "Personio", "Personio") },
  { id: "xing", letters: "XI", bg: "#006567", fg: FG, label: L("Xing", "Xing", "Xing", "Xing", "Xing", "Xing", "Xing", "Xing") },
  { id: "apple", letters: "AP", bg: "#333333", fg: FG, label: L("Apple", "Apple", "Apple", "Apple", "Apple", "Apple", "Apple", "Apple") },
  { id: "mycareersfuture", letters: "SG", bg: "#e31c3d", fg: FG, label: L("MyCareersFuture", "MyCareersFuture", "MyCareersFuture", "MyCareersFuture", "MyCareersFuture", "MyCareersFuture", "MyCareersFuture", "MyCareersFuture") },
  { id: "planned", letters: "PL", bg: "#3d6b61", fg: FG, label: L("Planned jobs", "Geplante Jobs", "Geplande vacatures", "Offres planifiées", "Plánované nabídky", "予定求人", "Planeeritud tööd", "Плановые вакансии") },
  { id: "musikforschung", letters: "MF", bg: "#6b2d5b", fg: FG, label: L("Musikforschung", "Musikforschung", "Musikforschung", "Musikforschung", "Musikforschung", "Musikforschung", "Musikforschung", "Musikforschung") },
  { id: "wissenschaftsstellen", letters: "WS", bg: "#084539", fg: FG, label: L("Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen", "Wissenschaftsstellen") },
  { id: "epo", letters: "EP", bg: "#003399", fg: FG, label: L("European Patent Office", "Europäisches Patentamt", "Europees Octrooibureau", "Office européen des brevets", "Evropský patentový úřad", "欧州特許庁", "Euroopa Patendiamet", "Европейское патентное ведомство", "यूरोपीय पेटेंट कार्यालय") },
  { id: "dpma", letters: "DP", bg: "#1a1a1a", fg: FG, label: L("DPMA", "DPMA", "DPMA", "DPMA", "DPMA", "DPMA", "DPMA", "DPMA", "डीपीएमए") },
  { id: "euipo", letters: "EO", bg: "#164194", fg: FG, label: L("EUIPO", "EUIPO", "EUIPO", "EUIPO", "EUIPO", "EUIPO", "EUIPO", "EUIPO", "EUIPO") },
  { id: "wipo", letters: "WO", bg: "#3366cc", fg: FG, label: L("WIPO", "WIPO", "WIPO", "OMPI", "WIPO", "WIPO", "WIPO", "ВОИС", "वाइपो") },
  { id: "ukipo", letters: "IO", bg: "#1d70b8", fg: FG, label: L("UK IPO", "UK IPO", "UK IPO", "UK IPO", "UK IPO", "UK IPO", "UK IPO", "UK IPO", "यूके आईपीओ") },
  { id: "worknet", letters: "WN", bg: "#003478", fg: FG, label: L("Worknet", "Worknet", "Worknet", "Worknet", "Worknet", "ワークネット", "Worknet", "Worknet", "वर्कनेट") },
  { id: "philjobnet", letters: "PJ", bg: "#0038a8", fg: FG, label: L("PhilJobNet", "PhilJobNet", "PhilJobNet", "PhilJobNet", "PhilJobNet", "PhilJobNet", "PhilJobNet", "PhilJobNet", "फिलजॉबनेट") },
  { id: "portalempleo", letters: "PE", bg: "#74acdf", fg: FG, label: L("Portal Empleo", "Portal Empleo", "Portal Empleo", "Portal Empleo", "Portal Empleo", "Portal Empleo", "Portal Empleo", "Portal Empleo", "पोर्टल एम्प्लियो") },
  { id: "hawaii", letters: "HA", bg: "#00247d", fg: FG, label: L("Hawaii jobs", "Hawaii", "Hawaï", "Hawaï", "Havaj", "ハワイ", "Hawaii", "Гавайи", "हवाई") },
  { id: "mol_oman", letters: "OM", bg: "#c8102e", fg: FG, label: L("Ministry of Labour Oman", "Arbeitsministerium Oman", "Ministerie van Arbeid Oman", "Ministère du travail Oman", "Ministerstvo práce Omán", "オマーン労働省", "Omaani tööministeerium", "Министерство труда Омана", "ओमान श्रम मंत्रालय") },
  { id: "zeit", letters: "ZE", bg: "#222222", fg: FG, label: L("ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs", "ZEIT Jobs") },
  { id: "monster", letters: "MO", bg: "#6e46ae", fg: FG, label: L("Monster", "Monster", "Monster", "Monster", "Monster", "Monster", "Monster", "Monster") },
  { id: "other", letters: "JB", bg: "#3d6b61", fg: FG, label: L("Job board", "Jobbörse", "Vacaturesite", "Job board", "Job portál", "求人サイト", "Tööportaal", "Доска вакансий") },
]

const BY_ID = new Map(BOARDS.map((b) => [b.id, b]))

const GENDER_RX =
  /\(?\s*(m\s*\/\s*[wfd]\s*\/\s*[wfdx]|w\s*\/\s*m\s*\/\s*d|f\s*\/\s*m\s*\/\s*d|d\s*\/\s*m\s*\/\s*w|all genders|alle geschlechter)\s*\)?/gi

/** ASCII fold matching the BigQuery grouping in patch_job_boards.sql. */
export function sqlFold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function stripGenderToken(title: string): string {
  return String(title || "").replace(GENDER_RX, " ")
}

/**
 * Duplicate cluster key: country | fold(company) | fold(title) | fold(location).
 * Empty company or title means the offer stays a singleton (null).
 */
export function foldDupKey(input: {
  country: string
  company: string
  title: string
  location: string
}): string | null {
  const company = sqlFold(input.company)
  const title = sqlFold(stripGenderToken(input.title))
  if (!company || !title) return null
  const loc = sqlFold(input.location)
  return `${String(input.country || "").toUpperCase()}|${company}|${title}|${loc}`
}

/** Map harvest source + listing URL to a board id. Keep in lockstep with patch_job_boards.sql. */
export function resolveBoardId(source: string, url: string): string {
  const s = String(source || "").toLowerCase()
  const u = String(url || "").toLowerCase()
  if (/stepstone/.test(u)) return "stepstone"
  if (/linkedin/.test(u)) return "linkedin"
  if (/indeed/.test(u)) return "indeed"
  if (/xing\.com/.test(u)) return "xing"
  if (/personio/.test(u)) return "personio"
  if (/monster\./.test(u)) return "monster"
  if (/arbeitsagentur/.test(s) || /arbeitsagentur\.de/.test(u)) return "arbeitsagentur"
  if (s === "eures" || /europa\.eu\/eures/.test(u)) return "eures"
  if (/^mpsv/.test(s) || /uradprace/.test(u)) return "mpsv"
  if (/reed/.test(s) || /reed\.co\.uk/.test(u)) return "reed"
  if (/greenhouse/.test(s) || /greenhouse\.io/.test(u)) return "greenhouse"
  if (/lever/.test(s) || /lever\.co/.test(u)) return "lever"
  if (/smartrecruiters/.test(s) || /smartrecruiters/.test(u)) return "smartrecruiters"
  if (/himalayas/.test(s) || /himalayas\.app/.test(u)) return "himalayas"
  if (/usajobs/.test(s) || /usajobs\.gov/.test(u)) return "usajobs"
  if (/france_travail/.test(s) || /francetravail|pole-emploi/.test(u)) return "france_travail"
  if (/apple/.test(s) || /apple\.com/.test(u)) return "apple"
  if (/mycareersfuture/.test(s) || /mycareersfuture/.test(u)) return "mycareersfuture"
  if (/^planned_jobs/.test(s)) return "planned"
  if (/arbeitnow/.test(s)) return "arbeitnow"
  if (/jobicy/.test(s)) return "jobicy"
  if (/remoteok/.test(s)) return "remoteok"
  if (/devitjobs/.test(s)) return "devitjobs"
  if (/musikforschung/.test(s)) return "musikforschung"
  if (/wissenschaftsstellen/.test(s)) return "wissenschaftsstellen"
  if (/^epo/.test(s) || /jobs\.epo\.org/.test(u)) return "epo"
  if (/^dpma/.test(s) || /dpma\.de/.test(u)) return "dpma"
  if (/^euipo/.test(s) || /euipo\.europa\.eu/.test(u)) return "euipo"
  if (/^wipo/.test(s) || /wipo\.int|wipo\.taleo/.test(u)) return "wipo"
  if (/^ukipo/.test(s) || /ipo\.gov\.uk/.test(u)) return "ukipo"
  if (/worknet|work\.go\.kr|work24\.go\.kr/.test(s + u)) return "worknet"
  if (/philjobnet/.test(s + u)) return "philjobnet"
  if (/portalempleo|portalempleo\.gob\.ar/.test(s + u)) return "portalempleo"
  if (
    /^hawaii/.test(s) ||
    /governmentjobs\.com\/careers\/(hawaii|honolulu|mauicounty|hawaiicounty|kauai|hawaiiedu|hhsc)/.test(u) ||
    /schooljobs\.com\/careers\/hawaii/.test(u)
  )
    return "hawaii"
  if (/mol_oman/.test(s) || /mol\.gov\.om|taj\.mol\.gov\.om|tawteen\.om/.test(u)) return "mol_oman"
  if (/zeit_jobs/.test(s) || /jobs\.zeit\.de/.test(u)) return "zeit"
  if (/google/.test(s)) return "google"
  const slug = s.replace(/\.(csv|jsonl|json)$/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return slug || "other"
}

function slugLetters(id: string): string {
  const parts = String(id || "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const s = (parts[0] || id).replace(/[^a-z0-9]/gi, "")
  return (s.slice(0, 2) || "JB").toUpperCase()
}

export function boardMeta(id: string): JobBoardMeta {
  const known = BY_ID.get(id)
  if (known) return { id: known.id, letters: known.letters, bg: known.bg, fg: known.fg }
  return { id, letters: slugLetters(id), bg: "#3d6b61", fg: FG }
}

export function boardLabel(id: string, locale: CatalogLocale): string {
  const known = BY_ID.get(id)
  if (known) return localePick(known.label, locale)
  return String(id || "other").replace(/_/g, " ")
}

export function uniqueBoards(boards: JobBoardMember[]): JobBoardMember[] {
  const out: JobBoardMember[] = []
  const seen = new Set<string>()
  const sorted = [...boards].sort((a, b) => a.member_rank - b.member_rank || a.board_id.localeCompare(b.board_id))
  for (const b of sorted) {
    const id = b.board_id || "other"
    if (seen.has(id)) continue
    seen.add(id)
    out.push(b)
  }
  return out
}
