import { L, parseCatalogLocale, type CatalogLocale, type LocaleLabels } from "./locales"

export const AVAILABILITY_VALUES = ["available", "probably_unavailable"] as const
export type Availability = (typeof AVAILABILITY_VALUES)[number]

export const AVAILABILITY_LABEL: Record<Availability, LocaleLabels> = {
  available: L(
    "Open to applications",
    "Offen für Bewerbungen",
    "Open voor sollicitaties",
    "Ouvert aux candidatures",
    "Otevřeno pro přihlášky",
    "応募受付中",
    "Avatud kandideerimiseks",
    "Открыто для откликов",
  ),
  probably_unavailable: L(
    "Closed to applications",
    "Geschlossen für Bewerbungen",
    "Gesloten voor sollicitaties",
    "Fermé aux candidatures",
    "Uzavřeno pro přihlášky",
    "応募終了",
    "Suletud kandideerimiseks",
    "Закрыто для откликов",
  ),
}

export function isAvailability(s: string): s is Availability {
  return s === "available" || s === "probably_unavailable"
}

export function parseAvailability(raw: string | null | undefined): Availability {
  const v = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (
    v === "probably_unavailable" ||
    v === "unavailable" ||
    v === "not_available" ||
    v === "notavailable" ||
    v === "closed" ||
    v === "close" ||
    v === "closed_to_applications" ||
    v === "close_to_applications"
  ) {
    return "probably_unavailable"
  }
  return "available"
}

export function availabilityLabel(id: Availability, locale: string | CatalogLocale = "en"): string {
  const labels = AVAILABILITY_LABEL[id]
  return labels[parseCatalogLocale(locale)] || labels.en
}

export function availabilityCount(
  _nTotal: number,
  nAvailable: number,
  nUnavailable: number,
  availability: Availability,
): number {
  if (availability === "probably_unavailable") return nUnavailable || 0
  return nAvailable || 0
}

export function availabilitySql(alias: string, availability: Availability): string {
  if (availability === "probably_unavailable") return `AND ${alias}.availability = 'probably_unavailable'`
  return `AND ${alias}.availability = 'available'`
}

export function seriesCount(
  point: { n_total: number; n_available: number; n_unavailable: number },
  availability: Availability,
): number {
  return availabilityCount(point.n_total, point.n_available, point.n_unavailable, availability)
}