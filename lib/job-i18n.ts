import { parseCatalogLocale, type CatalogLocale } from "./locales"
import { table } from "./bq"

export function catalogLocaleFromRequest(req: Request | URL): CatalogLocale {
  const url = req instanceof URL ? req : new URL(req.url)
  return parseCatalogLocale(url.searchParams.get("locale"))
}

/** LEFT JOIN serving translations for the request locale. Alias the jobs table as `j`. */
export function jobTranslationJoin(): string {
  return `LEFT JOIN ${table("job_offer_translations")} tr
            ON tr.job_key = j.job_key AND tr.locale = @locale`
}

export const TRANSLATED_TITLE_SQL = "COALESCE(NULLIF(tr.title, ''), j.title) AS title"
export const TRANSLATED_EXCERPT_SQL =
  "COALESCE(NULLIF(tr.excerpt, ''), j.description_excerpt) AS description_excerpt"
