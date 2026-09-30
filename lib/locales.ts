export const CATALOG_LOCALES = ["en", "de", "nl", "fr", "cs", "ja", "et", "ru"] as const
export type CatalogLocale = (typeof CATALOG_LOCALES)[number]
export const DEFAULT_CATALOG_LOCALE: CatalogLocale = "en"
export const CATALOG_LOCALE_STORAGE_KEY = "jobs2.catalog-locale"

export const CATALOG_LOCALE_BUTTONS: { id: CatalogLocale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "de", label: "DE" },
  { id: "nl", label: "NL" },
  { id: "fr", label: "FR" },
  { id: "cs", label: "CS" },
  { id: "ja", label: "JA" },
  { id: "et", label: "ET" },
  { id: "ru", label: "RU" },
]

const LOCALE_SET = new Set<string>(CATALOG_LOCALES)

export function isCatalogLocale(value: string | null | undefined): value is CatalogLocale {
  return LOCALE_SET.has(String(value || ""))
}

export function parseCatalogLocale(raw: string | null | undefined): CatalogLocale {
  const v = String(raw || "").trim().toLowerCase().replace("_", "-")
  if (v === "cz") return "cs"
  if (v === "jp") return "ja"
  if (v === "ee") return "et"
  if (isCatalogLocale(v)) return v
  const prefix = v.split("-")[0]
  if (isCatalogLocale(prefix)) return prefix
  return DEFAULT_CATALOG_LOCALE
}

export type LocaleLabels = Record<CatalogLocale, string>

export function localePick(row: LocaleLabels, locale: CatalogLocale): string {
  return row[locale] || row.en
}

export function L(
  en: string,
  de: string,
  nl: string,
  fr: string,
  cs: string,
  ja: string,
  et: string,
  ru: string,
): LocaleLabels {
  return { en, de, nl, fr, cs, ja, et, ru }
}
