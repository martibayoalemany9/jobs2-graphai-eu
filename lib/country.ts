/** ISO2 identity set (CENTROIDS from jobs-graphai-eu/lib/geo-markets.js) plus extras used on the map. */
export const ISO2 = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "GB", "US", "SG", "JP", "CH", "NO", "IS", "UA", "TR", "CA", "AU", "IN", "CN",
  "KR", "BR", "MX", "AE", "IL", "ZA", "FI", "EE", "LT", "LV",
] as const

export const TLD_COUNTRY: Record<string, string> = {
  de: "DE", at: "AT", ch: "CH", nl: "NL", be: "BE", fr: "FR", it: "IT", es: "ES",
  pt: "PT", pl: "PL", cz: "CZ", sk: "SK", hu: "HU", ro: "RO", bg: "BG", gr: "GR",
  ie: "IE", dk: "DK", se: "SE", fi: "FI", no: "NO", ee: "EE", lv: "LV", lt: "LT",
  lu: "LU", mt: "MT", cy: "CY", hr: "HR", si: "SI", uk: "GB", us: "US", jp: "JP",
  sg: "SG", au: "AU", ca: "CA", in: "IN", br: "BR", mx: "MX", kr: "KR", cn: "CN",
  tr: "TR", ua: "UA", il: "IL", za: "ZA", ae: "AE",
}

export const COUNTRY_LABEL: Record<string, string> = {
  DE: "Germany", FR: "France", GB: "United Kingdom", US: "United States", AT: "Austria",
  CH: "Switzerland", NL: "Netherlands", BE: "Belgium", IT: "Italy", ES: "Spain",
  PL: "Poland", SE: "Sweden", IE: "Ireland", DK: "Denmark", FI: "Finland", NO: "Norway",
  EE: "Estonia", PT: "Portugal", CZ: "Czechia", SK: "Slovakia", HU: "Hungary",
  RO: "Romania", BG: "Bulgaria", GR: "Greece", LV: "Latvia", LT: "Lithuania",
  LU: "Luxembourg", MT: "Malta", CY: "Cyprus", HR: "Croatia", SI: "Slovenia",
  JP: "Japan", SG: "Singapore", CA: "Canada", AU: "Australia", IN: "India",
  CN: "China", KR: "South Korea", BR: "Brazil", MX: "Mexico", AE: "UAE", IL: "Israel",
  ZA: "South Africa", TR: "Turkey", UA: "Ukraine", IS: "Iceland", ZZ: "Unknown",
}

/** Explicit name → iso2. Identity ISO2 rows are seeded in SQL, not here. */
export const COUNTRY_NAME_MAP: Record<string, string> = {
  uk: "GB",
  "great britain": "GB",
  "united kingdom": "GB",
  england: "GB",
  el: "GR",
  greece: "GR",
  germany: "DE",
  deutschland: "DE",
  czechia: "CZ",
  czech: "CZ",
  "czech republic": "CZ",
  netherlands: "NL",
  holland: "NL",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  china: "CN",
  "korea, republic of": "KR",
  "south korea": "KR",
}

export function countryLabel(iso2: string): string {
  const cc = String(iso2 || "").toUpperCase()
  return COUNTRY_LABEL[cc] || cc || "Unknown"
}

export function isIso2(s: string): boolean {
  return /^[A-Z]{2}$/.test(s)
}
