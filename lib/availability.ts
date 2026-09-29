export const AVAILABILITY_VALUES = ["all", "available", "probably_unavailable"] as const
export type Availability = (typeof AVAILABILITY_VALUES)[number]

export const AVAILABILITY_LABEL: Record<Availability, Record<"en" | "de" | "nl" | "fr", string>> = {
  all: { en: "All", de: "Alle", nl: "Alle", fr: "Tous" },
  available: { en: "Available", de: "Verfügbar", nl: "Beschikbaar", fr: "Disponible" },
  probably_unavailable: {
    en: "Not available",
    de: "Nicht verfügbar",
    nl: "Niet beschikbaar",
    fr: "Non disponible",
  },
}

export function isAvailability(s: string): s is Availability {
  return s === "all" || s === "available" || s === "probably_unavailable"
}

export function parseAvailability(raw: string | null | undefined): Availability {
  const v = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (v === "available") return "available"
  if (
    v === "probably_unavailable" ||
    v === "unavailable" ||
    v === "not_available" ||
    v === "notavailable"
  ) {
    return "probably_unavailable"
  }
  return "all"
}

export function availabilityLabel(id: Availability, locale = "en"): string {
  const labels = AVAILABILITY_LABEL[id]
  return labels[locale as keyof typeof labels] || labels.en
}

export function availabilityCount(
  nTotal: number,
  nAvailable: number,
  nUnavailable: number,
  availability: Availability,
): number {
  if (availability === "available") return nAvailable || 0
  if (availability === "probably_unavailable") return nUnavailable || 0
  return nTotal || 0
}

export function availabilitySql(alias: string, availability: Availability): string {
  if (availability === "available") return `AND ${alias}.availability = 'available'`
  if (availability === "probably_unavailable") return `AND ${alias}.availability = 'probably_unavailable'`
  return ""
}

export function seriesCount(
  point: { n_total: number; n_available: number; n_unavailable: number },
  availability: Availability,
): number {
  return availabilityCount(point.n_total, point.n_available, point.n_unavailable, availability)
}