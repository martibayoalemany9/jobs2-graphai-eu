export type SkillKind = "hard" | "soft"

export type SkillCluster = {
  id: string
  kind: SkillKind
  names: string[]
  label: string
}

export const SKILL_CATALOG: SkillCluster[] = [
  { id: "python", kind: "hard", names: ["python", "django", "flask", "fastapi", "pandas", "numpy"], label: "Python" },
  { id: "javascript", kind: "hard", names: ["javascript", "js ", "node.js", "nodejs", "react", "vue.js", "angular"], label: "JavaScript" },
  { id: "typescript", kind: "hard", names: ["typescript", "tsx"], label: "TypeScript" },
  { id: "sql", kind: "hard", names: ["sql", "postgres", "postgresql", "mysql", "snowflake"], label: "SQL / data stores" },
  { id: "cloud", kind: "hard", names: ["google cloud", "gcp", "aws", "azure", "kubernetes", "terraform"], label: "Cloud" },
  { id: "ml", kind: "hard", names: ["machine learning", "deep learning", "pytorch", "tensorflow", "llm"], label: "Machine learning" },
  { id: "systems", kind: "hard", names: ["c++", "rust", "golang", "go lang", "systems programming"], label: "Systems" },
  { id: "embedded", kind: "hard", names: ["embedded", "firmware", "rtos", "microcontroller"], label: "Embedded" },
  { id: "networking", kind: "hard", names: ["networking", "telecom", "5g", "lte", "tcp/ip", "routing"], label: "Networking" },
  { id: "security", kind: "hard", names: ["security", "cybersecurity", "appsec", "infosec"], label: "Security" },
  { id: "dataeng", kind: "hard", names: ["data engineering", "spark", "airflow", "etl", "kafka"], label: "Data engineering" },
  { id: "product", kind: "soft", names: ["product management", "roadmap", "stakeholder"], label: "Product" },
  { id: "ux", kind: "soft", names: ["ux", "user experience", "figma", "design system"], label: "UX" },
  { id: "project", kind: "soft", names: ["project management", "agile", "scrum"], label: "Project" },
  { id: "comms", kind: "soft", names: ["communication", "presentation"], label: "Communication" },
  { id: "leadership", kind: "soft", names: ["leadership", "people management", "mentoring"], label: "Leadership" },
  { id: "stakeholder", kind: "soft", names: ["stakeholder management"], label: "Stakeholders" },
  { id: "problem", kind: "soft", names: ["problem solving", "analytical"], label: "Problem solving" },
]

export function extractSpecialties(text: string): string[] {
  const hay = ` ${String(text || "").toLowerCase()} `
  const out: string[] = []
  const seen = new Set<string>()
  for (const sk of SKILL_CATALOG) {
    if (seen.has(sk.id)) continue
    if (!sk.names.some((n) => hay.includes(n.toLowerCase()))) continue
    seen.add(sk.id)
    out.push(sk.id)
  }
  return out
}

export function clusterById(id: string | null | undefined): SkillCluster | undefined {
  if (!id) return undefined
  return SKILL_CATALOG.find((s) => s.id === id)
}
