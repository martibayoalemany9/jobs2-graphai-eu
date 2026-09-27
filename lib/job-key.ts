import { createHash } from "node:crypto"

/** Lowercase, strip query/hash, strip trailing slashes. */
export function urlNorm(u: string): string {
  const raw = String(u || "").trim().toLowerCase()
  const noHashQuery = raw.replace(/[?#].*$/, "")
  return noHashQuery.replace(/\/+$/, "")
}

/**
 * Canonical job_key: first 18 bytes of SHA-256, unpadded base64url.
 * Must match BigQuery:
 *   TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')
 */
export function jobKeyFromNorm(urlNormed: string): string {
  const digest = createHash("sha256").update(urlNormed, "utf8").digest().subarray(0, 18)
  return digest.toString("base64url")
}

export function jobKeyFromUrl(url: string): string {
  return jobKeyFromNorm(urlNorm(url))
}
