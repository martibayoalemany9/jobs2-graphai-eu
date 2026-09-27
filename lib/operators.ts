export const OPERATOR_EMAILS = new Set([
  "martibayoalemany@gmail.com",
  "martibayoalemany@googlemail.com",
])

export function canonicalEmail(raw: string): string {
  const e = String(raw || "").trim().toLowerCase()
  const at = e.indexOf("@")
  if (at < 1) return e
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  if (domain === "googlemail.com") return `${local}@gmail.com`
  return e
}

export function isOperatorEmail(raw: string): boolean {
  const e = canonicalEmail(raw)
  if (OPERATOR_EMAILS.has(e) || OPERATOR_EMAILS.has(String(raw || "").trim().toLowerCase())) {
    return true
  }
  const [local, domain] = e.split("@")
  if (domain === "gmail.com" && OPERATOR_EMAILS.has(`${local}@googlemail.com`)) return true
  return false
}
