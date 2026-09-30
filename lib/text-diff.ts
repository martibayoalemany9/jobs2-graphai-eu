export type DiffOp = { type: "same" | "add" | "del"; text: string }

export function stripHtml(s: string): string {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function tokenize(s: string): string[] {
  const out: string[] = []
  const re = /\S+|\s+/g
  let m: RegExpExecArray | null
  const str = String(s || "")
  while ((m = re.exec(str))) out.push(m[0])
  return out
}

function mergeOps(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = []
  for (const op of ops) {
    if (!op.text) continue
    const last = out[out.length - 1]
    if (last && last.type === op.type) last.text += op.text
    else out.push({ type: op.type, text: op.text })
  }
  return out
}

const MAX_TOKENS = 2500

/**
 * Word-level LCS diff. `a` is the master text, `b` is the selected board.
 * Deleted spans are present only on the master; added spans only on the board.
 */
export function wordDiff(a: string, b: string): DiffOp[] {
  const A = tokenize(a).slice(0, MAX_TOKENS)
  const B = tokenize(b).slice(0, MAX_TOKENS)
  const n = A.length
  const m = B.length
  if (!n && !m) return []
  if (!n) return [{ type: "add", text: B.join("") }]
  if (!m) return [{ type: "del", text: A.join("") }]
  if (n === m && A.every((t, i) => t === B[i])) return [{ type: "same", text: A.join("") }]

  const dp: Int16Array[] = new Array(n + 1)
  for (let i = 0; i <= n; i++) dp[i] = new Int16Array(m + 1)
  for (let i = 1; i <= n; i++) {
    const Ai = A[i - 1]
    const row = dp[i]
    const prev = dp[i - 1]
    for (let j = 1; j <= m; j++) {
      if (Ai === B[j - 1]) row[j] = prev[j - 1] + 1
      else row[j] = prev[j] >= row[j - 1] ? prev[j] : row[j - 1]
    }
  }

  const rev: DiffOp[] = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) {
      rev.push({ type: "same", text: A[i - 1] })
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      rev.push({ type: "del", text: A[i - 1] })
      i--
    } else {
      rev.push({ type: "add", text: B[j - 1] })
      j--
    }
  }
  while (i > 0) {
    rev.push({ type: "del", text: A[i - 1] })
    i--
  }
  while (j > 0) {
    rev.push({ type: "add", text: B[j - 1] })
    j--
  }
  rev.reverse()
  return mergeOps(rev)
}
