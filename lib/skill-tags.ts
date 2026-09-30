import { foldText } from "./fold"
import { DEFAULT_CATALOG_LOCALE, L, type CatalogLocale, type LocaleLabels } from "./locales"

export type SkillTag = {
  id: string
  label: LocaleLabels
  names: string[]
}

/** Hard skills extracted from original listing title + description (not translations). */
export const SKILL_TAGS: SkillTag[] = [
  { id: "java", label: L("Java", "Java", "Java", "Java", "Java", "Java", "Java", "Java"), names: ["java", "spring boot", "spring framework", "jakarta ee", "j2ee"] },
  { id: "python", label: L("Python", "Python", "Python", "Python", "Python", "Python", "Python", "Python"), names: ["python", "django", "fastapi", "flask", "pandas"] },
  { id: "javascript", label: L("JavaScript", "JavaScript", "JavaScript", "JavaScript", "JavaScript", "JavaScript", "JavaScript", "JavaScript"), names: ["javascript", "node.js", "nodejs", "node js"] },
  { id: "typescript", label: L("TypeScript", "TypeScript", "TypeScript", "TypeScript", "TypeScript", "TypeScript", "TypeScript", "TypeScript"), names: ["typescript"] },
  { id: "csharp", label: L("C#", "C#", "C#", "C#", "C#", "C#", "C#", "C#"), names: ["c#", "csharp", ".net", "dotnet", "asp.net"] },
  { id: "cpp", label: L("C++", "C++", "C++", "C++", "C++", "C++", "C++", "C++"), names: ["c++", "cplusplus"] },
  { id: "golang", label: L("Go", "Go", "Go", "Go", "Go", "Go", "Go", "Go"), names: ["golang", "go lang"] },
  { id: "kotlin", label: L("Kotlin", "Kotlin", "Kotlin", "Kotlin", "Kotlin", "Kotlin", "Kotlin", "Kotlin"), names: ["kotlin"] },
  { id: "rust", label: L("Rust", "Rust", "Rust", "Rust", "Rust", "Rust", "Rust", "Rust"), names: ["rust lang", "rust developer", "rust engineer", "(rust)"] },
  { id: "php", label: L("PHP", "PHP", "PHP", "PHP", "PHP", "PHP", "PHP", "PHP"), names: ["php", "laravel", "symfony"] },
  { id: "ruby", label: L("Ruby", "Ruby", "Ruby", "Ruby", "Ruby", "Ruby", "Ruby", "Ruby"), names: ["ruby", "ruby on rails"] },
  { id: "swift", label: L("Swift", "Swift", "Swift", "Swift", "Swift", "Swift", "Swift", "Swift"), names: ["swift", "swiftui"] },
  { id: "sql", label: L("SQL", "SQL", "SQL", "SQL", "SQL", "SQL", "SQL", "SQL"), names: ["sql", "postgresql", "postgres", "mysql", "t-sql"] },
  { id: "react", label: L("React", "React", "React", "React", "React", "React", "React", "React"), names: ["react", "react.js", "reactjs"] },
  { id: "angular", label: L("Angular", "Angular", "Angular", "Angular", "Angular", "Angular", "Angular", "Angular"), names: ["angular"] },
  { id: "vue", label: L("Vue", "Vue", "Vue", "Vue", "Vue", "Vue", "Vue", "Vue"), names: ["vue.js", "vuejs", "vue js"] },
  { id: "spring", label: L("Spring", "Spring", "Spring", "Spring", "Spring", "Spring", "Spring", "Spring"), names: ["spring boot", "spring framework"] },
  { id: "kafka", label: L("Kafka", "Kafka", "Kafka", "Kafka", "Kafka", "Kafka", "Kafka", "Kafka"), names: ["kafka"] },
  { id: "spark", label: L("Spark", "Spark", "Spark", "Spark", "Spark", "Spark", "Spark", "Spark"), names: ["apache spark", "pyspark", "spark"] },
  { id: "airflow", label: L("Airflow", "Airflow", "Airflow", "Airflow", "Airflow", "Airflow", "Airflow", "Airflow"), names: ["airflow"] },
  { id: "kubernetes", label: L("Kubernetes", "Kubernetes", "Kubernetes", "Kubernetes", "Kubernetes", "Kubernetes", "Kubernetes", "Kubernetes"), names: ["kubernetes", "k8s"] },
  { id: "docker", label: L("Docker", "Docker", "Docker", "Docker", "Docker", "Docker", "Docker", "Docker"), names: ["docker"] },
  { id: "terraform", label: L("Terraform", "Terraform", "Terraform", "Terraform", "Terraform", "Terraform", "Terraform", "Terraform"), names: ["terraform"] },
  { id: "linux", label: L("Linux", "Linux", "Linux", "Linux", "Linux", "Linux", "Linux", "Linux"), names: ["linux", "rhel", "ubuntu"] },
  { id: "aws", label: L("AWS", "AWS", "AWS", "AWS", "AWS", "AWS", "AWS", "AWS"), names: ["aws", "amazon web services"] },
  { id: "azure", label: L("Azure", "Azure", "Azure", "Azure", "Azure", "Azure", "Azure", "Azure"), names: ["azure", "microsoft azure"] },
  { id: "gcp", label: L("GCP", "GCP", "GCP", "GCP", "GCP", "GCP", "GCP", "GCP"), names: ["google cloud", "gcp"] },
  { id: "sap", label: L("SAP", "SAP", "SAP", "SAP", "SAP", "SAP", "SAP", "SAP"), names: ["sap", "s/4hana", "s4hana"] },
  { id: "abap", label: L("ABAP", "ABAP", "ABAP", "ABAP", "ABAP", "ABAP", "ABAP", "ABAP"), names: ["abap"] },
  { id: "sap_mm", label: L("SAP MM", "SAP MM", "SAP MM", "SAP MM", "SAP MM", "SAP MM", "SAP MM", "SAP MM"), names: ["sap mm"] },
  { id: "sap_sd", label: L("SAP SD", "SAP SD", "SAP SD", "SAP SD", "SAP SD", "SAP SD", "SAP SD", "SAP SD"), names: ["sap sd"] },
  { id: "salesforce", label: L("Salesforce", "Salesforce", "Salesforce", "Salesforce", "Salesforce", "Salesforce", "Salesforce", "Salesforce"), names: ["salesforce"] },
  { id: "servicenow", label: L("ServiceNow", "ServiceNow", "ServiceNow", "ServiceNow", "ServiceNow", "ServiceNow", "ServiceNow", "ServiceNow"), names: ["servicenow"] },
  { id: "excel", label: L("Excel", "Excel", "Excel", "Excel", "Excel", "Excel", "Excel", "Excel"), names: ["excel", "microsoft excel"] },
  { id: "powerbi", label: L("Power BI", "Power BI", "Power BI", "Power BI", "Power BI", "Power BI", "Power BI", "Power BI"), names: ["power bi", "powerbi"] },
  { id: "tableau", label: L("Tableau", "Tableau", "Tableau", "Tableau", "Tableau", "Tableau", "Tableau", "Tableau"), names: ["tableau"] },
  { id: "snowflake", label: L("Snowflake", "Snowflake", "Snowflake", "Snowflake", "Snowflake", "Snowflake", "Snowflake", "Snowflake"), names: ["snowflake"] },
  { id: "databricks", label: L("Databricks", "Databricks", "Databricks", "Databricks", "Databricks", "Databricks", "Databricks", "Databricks"), names: ["databricks"] },
  { id: "ml", label: L("Machine learning", "Machine Learning", "Machine learning", "Machine learning", "Strojové učení", "機械学習", "Masinõpe", "Машинное обучение"), names: ["machine learning", "deep learning", "pytorch", "tensorflow"] },
  { id: "llm", label: L("LLM", "LLM", "LLM", "LLM", "LLM", "LLM", "LLM", "LLM"), names: ["llm", "large language model", "generative ai"] },
  { id: "devops", label: L("DevOps", "DevOps", "DevOps", "DevOps", "DevOps", "DevOps", "DevOps", "DevOps"), names: ["devops", "ci/cd", "cicd", "site reliability", "sre"] },
  { id: "cybersecurity", label: L("Cybersecurity", "Cybersecurity", "Cybersecurity", "Cybersécurité", "Kybernetická bezpečnost", "サイバーセキュリティ", "Küberturve", "Кибербезопасность"), names: ["cybersecurity", "infosec", "appsec", "information security"] },
  { id: "embedded", label: L("Embedded", "Embedded", "Embedded", "Embedded", "Embedded", "組み込み", "Embedded", "Встраиваемые системы"), names: ["embedded", "firmware", "rtos", "microcontroller"] },
  { id: "autosar", label: L("AUTOSAR", "AUTOSAR", "AUTOSAR", "AUTOSAR", "AUTOSAR", "AUTOSAR", "AUTOSAR", "AUTOSAR"), names: ["autosar"] },
  { id: "matlab", label: L("MATLAB", "MATLAB", "MATLAB", "MATLAB", "MATLAB", "MATLAB", "MATLAB", "MATLAB"), names: ["matlab", "simulink"] },
  { id: "git", label: L("Git", "Git", "Git", "Git", "Git", "Git", "Git", "Git"), names: ["git", "github", "gitlab"] },
  { id: "scrum", label: L("Scrum", "Scrum", "Scrum", "Scrum", "Scrum", "Scrum", "Scrum", "Scrum"), names: ["scrum", "product owner", "scrum master"] },
  { id: "agile", label: L("Agile", "Agile", "Agile", "Agile", "Agile", "アジャイル", "Agile", "Agile"), names: ["agile"] },
  {
    id: "forklift",
    label: L("Forklift", "Stapler", "Heftruck", "Chariot élévateur", "Vysokozdvižný vozík", "フォークリフト", "Kahveltõstuk", "Погрузчик"),
    names: [
      "staplerfahrer",
      "gabelstapler",
      "gabelstaplerfahrer",
      "staplerschein",
      "staplerfuhrerschein",
      "flurfoerdermittel",
      "heftruck",
      "heftruckchauffeur",
      "forklift",
      "vysokozdvizneho voziku",
      "vysokozdvizny vozik",
    ],
  },
  {
    id: "cnc",
    label: L("CNC", "CNC", "CNC", "CNC", "CNC", "CNC", "CNC", "CNC"),
    names: ["cnc", "zerspanung", "fräser", "fraeser", "dreher"],
  },
  {
    id: "welding",
    label: L("Welding", "Schweißen", "Lassen", "Soudage", "Svařování", "溶接", "Keevitamine", "Сварка"),
    names: ["schweisser", "schweißer", "schweissen", "schweißen", "welder", "lasser", "svarovac", "svarec"],
  },
  {
    id: "sps",
    label: L("PLC / SPS", "SPS", "PLC", "API / PLC", "PLC", "PLC", "PLC", "ПЛК"),
    names: ["sps", "speicherprogrammierbar", "plc programming", "siemens tia"],
  },
  {
    id: "electrician",
    label: L("Electrical", "Elektro", "Elektrotechniek", "Électricité", "Elektro", "電気", "Elekter", "Электрика"),
    names: ["elektroniker", "elektriker", "elektrofachkraft", "electrician", "elektromonteur"],
  },
  {
    id: "mechatronics",
    label: L("Mechatronics", "Mechatronik", "Mechatronica", "Mécatronique", "Mechatronika", "メカトロニクス", "Mehhatroonika", "Мехатроника"),
    names: ["mechatroniker", "mechatronics", "mechatronik"],
  },
  {
    id: "crane",
    label: L("Crane", "Kran", "Kraan", "Grue", "Jeřáb", "クレーン", "Kraana", "Кран"),
    names: ["kranfuehrer", "kranführer", "kranschein", "hallenkran", "portalkran"],
  },
  {
    id: "driving_b",
    label: L("Driving licence B", "Führerschein B", "Rijbewijs B", "Permis B", "Řidičák B", "普通免許", "B-kategooria", "Права категории B"),
    names: ["fuhrerschein klasse b", "führerschein klasse b", "fuhrerschein b", "führerschein b", "rijbewijs b", "driving licence b", "driver license b"],
  },
  {
    id: "driving_ce",
    label: L("Driving licence C/CE", "Führerschein C/CE", "Rijbewijs C/CE", "Permis C/CE", "Řidičák C/CE", "大型免許", "C-kategooria", "Права C/CE"),
    names: ["fuhrerschein ce", "führerschein ce", "fuhrerschein klasse c", "führerschein klasse c", "rijbewijs ce", "c+e"],
  },
  {
    id: "german",
    label: L("German", "Deutsch", "Duits", "Allemand", "Němčina", "ドイツ語", "Saksa keel", "Немецкий"),
    names: ["deutschkenntnisse", "deutsche sprache", "german language", "nemcina", "němčina", "duits", "deutsch"],
  },
  {
    id: "english",
    label: L("English", "Englisch", "Engels", "Anglais", "Angličtina", "英語", "Inglise keel", "Английский"),
    names: ["englischkenntnisse", "english language", "engels", "anglictina", "angličtina"],
  },
  {
    id: "dutch",
    label: L("Dutch", "Niederländisch", "Nederlands", "Néerlandais", "Nizozemština", "オランダ語", "Hollandi keel", "Нидерландский"),
    names: ["niederlandisch", "niederländisch", "nederlands", "dutch language"],
  },
  {
    id: "czech",
    label: L("Czech", "Tschechisch", "Tsjechisch", "Tchèque", "Čeština", "チェコ語", "Tšehhi keel", "Чешский"),
    names: ["tschechisch", "cestina", "čeština", "czech language"],
  },
  {
    id: "french",
    label: L("French", "Französisch", "Frans", "Français", "Francouzština", "フランス語", "Prantsuse keel", "Французский"),
    names: ["franzosisch", "französisch", "french language", "francais"],
  },
  {
    id: "nursing",
    label: L("Nursing", "Pflege", "Verpleging", "Soins infirmiers", "Ošetřovatelství", "看護", "Õendus", "Сестринское дело"),
    names: ["pflegefachkraft", "gesundheits- und krankenpfleger", "registered nurse", "verpleegkundige", "examinierte pflege"],
  },
  { id: "datev", label: L("DATEV", "DATEV", "DATEV", "DATEV", "DATEV", "DATEV", "DATEV", "DATEV"), names: ["datev"] },
]

export function skillTagById(id: string | null | undefined): SkillTag | undefined {
  if (!id) return undefined
  return SKILL_TAGS.find((s) => s.id === id)
}

export function skillTagLabel(id: string, locale: CatalogLocale = DEFAULT_CATALOG_LOCALE, fallback?: string): string {
  const row = skillTagById(id)
  if (row) return row.label[locale] || row.label.en
  return fallback || id
}

export function needleNeedsBoundary(needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (n.length <= 4) return true
  return [
    "java",
    "spark",
    "excel",
    "linux",
    "swift",
    "react",
    "kafka",
    "agile",
    "scrum",
    "deutsch",
    "english",
    "nederlands",
    "angular",
    "docker",
    "spring",
  ].includes(n)
}

export function skillNeedles(): { id: string; needle: string; boundary: boolean }[] {
  const out: { id: string; needle: string; boundary: boolean }[] = []
  const seen = new Set<string>()
  for (const sk of SKILL_TAGS) {
    const names = [...sk.names].sort((a, b) => b.length - a.length)
    for (const raw of names) {
      const needle = foldText(raw).trim()
      if (needle.length < 2) continue
      const key = `${sk.id}\t${needle}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ id: sk.id, needle, boundary: needleNeedsBoundary(needle) })
    }
  }
  return out
}

export function stripHtml(text: string): string {
  return String(text || "").replace(/<[^>]+>/g, " ")
}

export function extractSkillTags(text: string, limit = 16): string[] {
  const hay = ` ${foldText(stripHtml(text)).replace(/[^a-z0-9+.#]+/g, " ")} `
  const found: string[] = []
  const seen = new Set<string>()
  for (const n of skillNeedles()) {
    if (seen.has(n.id)) continue
    const hit = n.boundary
      ? new RegExp(`(^|[^a-z0-9+.#])${escapeRx(n.needle)}([^a-z0-9+.#]|$)`).test(hay.trim())
        || hay.includes(` ${n.needle} `)
      : hay.includes(n.needle)
    if (!hit) continue
    seen.add(n.id)
    found.push(n.id)
    if (found.length >= limit) break
  }
  return found
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export type CatalogCertRow = {
  cert_id: string
  certification_name: string
  provider?: string
  certification_url?: string
  skill_regex?: string
  mention_regex?: string
}

export function catalogRowMatchesSkill(row: CatalogCertRow, skillId: string): boolean {
  const skill = skillTagById(skillId)
  if (!skill) return false
  const blob = foldText(
    `${row.cert_id} ${row.certification_name} ${row.provider || ""} ${row.skill_regex || ""} ${row.mention_regex || ""}`,
  )
  if (skill.names.some((n) => foldText(n).length >= 3 && blob.includes(foldText(n)))) return true
  if (blob.includes(skill.id.replace(/_/g, " ")) || blob.includes(foldText(skill.label.en))) return true
  const rx = row.skill_regex || ""
  if (rx) {
    try {
      const re = new RegExp(rx, "i")
      if (re.test(skill.id) || re.test(skill.label.en) || skill.names.some((n) => re.test(n))) return true
    } catch {
      /* ignore invalid catalog regex */
    }
  }
  return false
}
