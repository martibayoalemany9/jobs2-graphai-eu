import { BigQuery } from "@google-cloud/bigquery"

const PROJECT = process.env.BQ_PROJECT || "poetic-sentinel-402405"
const DATASET = process.env.BQ_DATASET || "apply_jobs_jobs2_dev"

let client: BigQuery | null = null

export function bqEnv(): "prod" | "dev" {
  return DATASET.includes("prod") ? "prod" : "dev"
}

export function datasetId(): string {
  return DATASET
}

export function projectId(): string {
  return PROJECT
}

export function table(name: string): string {
  return `\`${PROJECT}.${DATASET}.${name}\``
}

export function getBigQuery(): BigQuery {
  if (client) return client
  const json = process.env.BQ_SA_JSON
  if (json) {
    const creds = JSON.parse(json)
    client = new BigQuery({ projectId: PROJECT, credentials: creds, location: "EU" })
  } else {
    client = new BigQuery({ projectId: PROJECT, location: "EU" })
  }
  return client
}

export async function bqQuery<T extends Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const bq = getBigQuery()
  const [rows] = await bq.query({
    query: sql,
    location: "EU",
    params: params || {},
    types: undefined,
    useQueryCache: true,
    maximumBytesBilled: process.env.BQ_MAX_BYTES || "2000000000",
  })
  return rows as T[]
}

export function num(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "number") return v
  if (typeof v === "object" && v && "value" in (v as object)) return Number((v as { value: string }).value)
  return Number(v) || 0
}
