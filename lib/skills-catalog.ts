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
  {
    id: "nursing",
    kind: "soft",
    names: [
      "krankenschwester",
      "krankenpfleger",
      "krankenpflege",
      "pflegefachkraft",
      "pflegefach",
      "registered nurse",
      " nurse",
      "nursing",
      "gesundheits- und kranken",
      "hebamme",
      "midwife",
    ],
    label: "Nursing / care",
  },
  {
    id: "teaching",
    kind: "soft",
    names: [
      "lehrerin",
      "lehrer",
      "teacher",
      "teaching",
      "unterricht",
      "pädagog",
      "padagog",
      "erzieherin",
      "erzieher",
      "schulsozial",
    ],
    label: "Teaching",
  },
  {
    id: "social",
    kind: "soft",
    names: [
      "sozialarbeiter",
      "sozialpädagog",
      "sozialpadagog",
      "social worker",
      "social work",
      "caseworker",
      "case worker",
    ],
    label: "Social work",
  },
  {
    id: "medicine",
    kind: "hard",
    names: [
      "physician",
      "medical doctor",
      "facharzt",
      "assistenzarzt",
      "approbation",
      "neurolog",
      "gmc",
    ],
    label: "Medicine",
  },
  {
    id: "neurology",
    kind: "hard",
    names: ["neurolog", "neurology", "abpn"],
    label: "Neurology",
  },
  {
    id: "chemistry",
    kind: "hard",
    names: ["chemist", "chemiker", "cchem", "reach", "glp"],
    label: "Chemistry",
  },
  {
    id: "science",
    kind: "hard",
    names: ["chartered scientist", "laboratory scientist", "research scientist", "csci"],
    label: "Science",
  },
  {
    id: "research",
    kind: "hard",
    names: ["clinical research", "ich-gcp", "postdoc", "wissenschaftlicher mitarbeiter"],
    label: "Research",
  },
  {
    id: "management",
    kind: "soft",
    names: ["mba", "chartered manager", "geschäftsführer", "general manager"],
    label: "Management",
  },
  {
    id: "public",
    kind: "soft",
    names: ["civil servant", "öffentlicher dienst", "public finance", "cipfa"],
    label: "Public services",
  },
  {
    id: "finance",
    kind: "hard",
    names: ["cfa", "financial analyst", "frm", "investment analyst", "mifid"],
    label: "Financial services",
  },
  {
    id: "actuary",
    kind: "hard",
    names: ["actuary", "aktuar", "actuarial", "fia", "dav"],
    label: "Actuarial",
  },
  {
    id: "aeronautics",
    kind: "hard",
    names: ["avionics", "aircraft mechanic", "part-66", "do-178", "airline pilot"],
    label: "Aeronautics",
  },
  {
    id: "automotive",
    kind: "hard",
    names: ["automotive", "iatf", "iso 26262", "aspice", "kfz", "autosar"],
    label: "Automotive",
  },
  {
    id: "electricity",
    kind: "hard",
    names: ["electrician", "elektriker", "18th edition", "vde", "elektrofachkraft"],
    label: "Electricity",
  },
  {
    id: "telecom",
    kind: "hard",
    names: ["telecommunications", "hcip", "jncia", "fibre", "network engineer"],
    label: "Telecommunications",
  },
  {
    id: "hardware",
    kind: "hard",
    names: ["hardware engineer", "ipc-a-610", "fpga", "asic", "pcb"],
    label: "Hardware engineering",
  },
  {
    id: "nanotech",
    kind: "hard",
    names: ["nanotechnology", "nanoscience", "nanomaterial"],
    label: "Nanotechnology",
  },
  {
    id: "quantum",
    kind: "hard",
    names: ["quantum computing", "qiskit", "quantum physicist", "qubit"],
    label: "Quantum computing",
  },
  {
    id: "bizdev",
    kind: "soft",
    names: ["business development", "salesforce", "hubspot", "account executive"],
    label: "Business development",
  },
  {
    id: "bi",
    kind: "hard",
    names: ["business intelligence", "power bi", "tableau", "looker"],
    label: "Business intelligence",
  },
  {
    id: "bizanalysis",
    kind: "soft",
    names: ["business analyst", "cbap", "ireb", "requirements engineer"],
    label: "Business analysis",
  },
  { id: "uncategorized", kind: "soft", names: [], label: "Other occupations" },
]

export function extractSpecialties(text: string): string[] {
  const hay = ` ${String(text || "").toLowerCase()} `
  const out: string[] = []
  const seen = new Set<string>()
  for (const sk of SKILL_CATALOG) {
    if (seen.has(sk.id)) continue
    if (sk.id === "uncategorized" || sk.names.length === 0) continue
    if (!sk.names.some((n) => hay.includes(n.toLowerCase()))) continue
    seen.add(sk.id)
    out.push(sk.id)
  }
  return out
}

export const UNCATEGORIZED_ID = "uncategorized"

export function clusterById(id: string | null | undefined): SkillCluster | undefined {
  if (!id) return undefined
  return SKILL_CATALOG.find((s) => s.id === id)
}

export function specialtyLabel(id: string): string {
  return clusterById(id)?.label || id
}
