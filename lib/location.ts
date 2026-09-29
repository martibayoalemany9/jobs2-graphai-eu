import { foldText } from "./fold"
import { COUNTRY_LABEL, isIso2 } from "./country"

const GENERIC_TOKENS = new Set(
  [
    "",
    "default",
    "unknown",
    "n/a",
    "na",
    "none",
    "null",
    "-",
    ".",
    "eu (other)",
    "europe",
    "worldwide",
    "global",
    ...Object.values(COUNTRY_LABEL).map((s) => s.toLowerCase()),
    ...Object.keys(COUNTRY_LABEL).map((s) => s.toLowerCase()),
    "deutschland",
    "holland",
    "czech republic",
    "usa",
    "uk",
    "great britain",
    "england",
  ].map((s) => foldText(s)),
)

/** NL NUTS-2 prefixes → province. */
export const NL_NUTS: Record<string, string> = {
  nl11: "Groningen",
  nl12: "Friesland",
  nl13: "Drenthe",
  nl21: "Overijssel",
  nl22: "Gelderland",
  nl23: "Flevoland",
  nl31: "Utrecht",
  nl32: "Noord-Holland",
  nl33: "Zuid-Holland",
  nl34: "Zeeland",
  nl41: "Noord-Brabant",
  nl42: "Limburg",
}

/** Cities used to recover a place from title/company when location is generic. */
export const CITIES = [
  "Berlin", "Hamburg", "Munich", "München", "Cologne", "Köln", "Frankfurt", "Stuttgart",
  "Düsseldorf", "Dortmund", "Leipzig", "Bremen", "Dresden", "Hannover", "Nuremberg",
  "Nürnberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Karlsruhe",
  "Mannheim", "Augsburg", "Wiesbaden", "Gelsenkirchen", "Aachen", "Braunschweig", "Kiel",
  "Chemnitz", "Magdeburg", "Freiburg", "Krefeld", "Mainz", "Lübeck", "Erfurt",
  "Rostock", "Kassel", "Hagen", "Potsdam", "Saarbrücken", "Hamm", "Ludwigshafen", "Oldenburg",
  "Osnabrück", "Leverkusen", "Heidelberg", "Darmstadt", "Solingen", "Regensburg", "Paderborn",
  "Ingolstadt", "Würzburg", "Wolfsburg", "Ulm", "Heilbronn", "Göttingen", "Offenbach",
  "Reutlingen", "Koblenz", "Jena", "Erlangen", "Trier", "Siegen", "Hildesheim", "Cottbus",
  "Amsterdam", "Rotterdam", "The Hague", "Den Haag", "Utrecht", "Eindhoven", "Groningen",
  "Tilburg", "Almere", "Breda", "Nijmegen", "Arnhem", "Haarlem", "Enschede", "Amersfoort",
  "Zaanstad", "Apeldoorn", "Maastricht", "Leiden", "Dordrecht", "Zoetermeer", "Zwolle",
  "Prague", "Praha", "Brno", "Ostrava", "Plzen", "Plzeň", "Liberec", "Olomouc", "Ceske Budejovice",
  "Hradec Kralove", "Pardubice", "Zlin", "Havirov", "Kladno", "Opava", "Karlovy Vary",
  "Jihlava", "Teplice",
  "Paris", "Lyon", "Marseille", "Toulouse", "Nantes", "Strasbourg", "Montpellier",
  "Bordeaux", "Lille", "Rennes", "Reims", "Grenoble",
  "Vienna", "Wien", "Graz", "Linz", "Salzburg", "Innsbruck",
  "Zurich", "Zürich", "Geneva", "Basel", "Bern", "Lausanne", "Winterthur",
  "Brussels", "Brussel", "Antwerp", "Antwerpen", "Ghent", "Gent", "Liège", "Charleroi",
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Edinburgh",
  "Cambridge", "Oxford", "Newcastle",
  "New York", "San Francisco", "Cupertino", "Seattle", "Austin", "Boston", "Chicago",
  "Los Angeles", "Washington", "Atlanta", "Denver", "Dallas",
  "Singapore", "Dublin", "Stockholm", "Copenhagen", "Oslo", "Helsinki", "Warsaw", "Krakow",
  "Madrid", "Barcelona", "Milan", "Rome", "Lisbon", "Luxembourg", "Walldorf", "Montabaur",
]

const CITY_FOLD = CITIES.map((city) => ({ city, fold: foldText(city) })).sort(
  (a, b) => b.fold.length - a.fold.length,
)

export function isRemoteFlag(isRemote?: string | null, title?: string | null): boolean {
  const blob = `${isRemote || ""} ${title || ""}`.toLowerCase()
  if (/remote|homeoffice|home office|hybrid/.test(blob)) return true
  return /^(true|yes|ja|1)$/.test(String(isRemote || "").trim().toLowerCase())
}

export function nutsLabel(raw: string): string | null {
  const m = foldText(raw).match(/\bnl([0-9]{2})[a-z0-9]?\b/)
  if (!m) return null
  return NL_NUTS[`nl${m[1]}`] || null
}

export function isGenericLocation(loc?: string | null): boolean {
  const s = foldText(loc || "").trim()
  if (!s) return true
  if (GENERIC_TOKENS.has(s)) return true
  if (/^[a-z]{2}$/.test(s)) return true
  if (/^nl[0-9a-z]{2,3}(,|\s|$)/.test(s)) return true
  if (/^obec\//.test(s)) return true
  return false
}

export function extractCity(text?: string | null): string | null {
  const hay = ` ${foldText(text || "")} `
  for (const c of CITY_FOLD) {
    if (hay.includes(` ${c.fold} `) || hay.includes(` ${c.fold},`) || hay.endsWith(` ${c.fold} `)) {
      return c.city
    }
  }
  return null
}

export function prettyCountry(iso2?: string | null): string {
  const cc = String(iso2 || "").toUpperCase()
  return COUNTRY_LABEL[cc] || cc || ""
}

export function resolveHeadquarters(opts: {
  headquarters?: string | null
  jobLocation?: string | null
  title?: string | null
  company?: string | null
  countryIso2?: string | null
}): string {
  const fromHqCity = extractCity(opts.headquarters || "")
  if (fromHqCity) return fromHqCity
  const fromTitle = extractCity(`${opts.title || ""} ${opts.company || ""}`)
  if (fromTitle) return fromTitle
  const fromLoc = extractCity(opts.jobLocation || "")
  if (fromLoc) return fromLoc
  const nuts = opts.jobLocation ? nutsLabel(opts.jobLocation) : null
  if (nuts) return nuts
  if (opts.headquarters && !isGenericLocation(opts.headquarters)) return String(opts.headquarters).trim()
  return prettyCountry(opts.countryIso2)
}

export function resolveJobLocation(opts: {
  jobLocation?: string | null
  title?: string | null
  company?: string | null
  isRemote?: string | null
  headquarters?: string | null
  countryIso2?: string | null
}): { location: string; headquarters: string; usedHeadquarters: boolean } {
  const hq = resolveHeadquarters(opts)
  const remote = isRemoteFlag(opts.isRemote, opts.title)
  const posted = String(opts.jobLocation || "").trim()
  const fromTitle = extractCity(`${opts.title || ""} ${opts.company || ""}`)
  const nuts = posted ? nutsLabel(posted) : null

  if (remote) {
    const loc = !posted || isGenericLocation(posted) ? "Remote" : posted
    return { location: loc, headquarters: hq, usedHeadquarters: false }
  }

  if (fromTitle) {
    return { location: fromTitle, headquarters: hq, usedHeadquarters: false }
  }
  if (nuts) {
    return { location: nuts, headquarters: hq, usedHeadquarters: false }
  }
  if (!posted || isGenericLocation(posted)) {
    return { location: hq, headquarters: hq, usedHeadquarters: true }
  }
  return { location: posted, headquarters: hq, usedHeadquarters: false }
}

export function formatLocationLine(opts: {
  location: string
  headquarters: string
  usedHeadquarters: boolean
  remote?: boolean
}): string {
  const loc = opts.location
  const hq = opts.headquarters
  if (!hq || foldText(hq) === foldText(loc)) return loc
  if (opts.usedHeadquarters) return loc
  return `${loc} · HQ ${hq}`
}

export function isIso2Code(s: string): boolean {
  return isIso2(String(s || "").toUpperCase())
}
