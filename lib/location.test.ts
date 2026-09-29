import assert from "node:assert/strict"
import test from "node:test"
import {
  extractCity,
  formatLocationLine,
  isGenericLocation,
  isRemoteFlag,
  nutsLabel,
  resolveJobLocation,
} from "./location"
import { extractSpecialties, specialtyLabel } from "./skills-catalog"

test("generic country and default locations", () => {
  assert.equal(isGenericLocation("Germany"), true)
  assert.equal(isGenericLocation("default"), true)
  assert.equal(isGenericLocation("DE"), true)
  assert.equal(isGenericLocation("nl32b, netherlands"), true)
  assert.equal(isGenericLocation("Düsseldorf"), false)
  assert.equal(isGenericLocation("Cupertino"), false)
})

test("NUTS NL maps to a province", () => {
  assert.equal(nutsLabel("nl32b, netherlands"), "Noord-Holland")
  assert.equal(nutsLabel("NL414, Netherlands"), "Noord-Brabant")
})

test("city from German title when location is Germany", () => {
  const r = resolveJobLocation({
    jobLocation: "Germany",
    title: "Verkaufsberater:in (W/M/D) Minijob Düsseldorf",
    headquarters: "DE",
    countryIso2: "DE",
    isRemote: "false",
  })
  assert.equal(r.location, "Düsseldorf")
  assert.equal(r.usedHeadquarters, false)
})

test("on-site default location uses headquarters city or country", () => {
  const r = resolveJobLocation({
    jobLocation: "default",
    title: "Warehouse operative",
    headquarters: "DE",
    countryIso2: "DE",
    isRemote: "",
  })
  assert.equal(r.usedHeadquarters, true)
  assert.equal(r.location, "Germany")
})

test("remote keeps Remote when location is generic", () => {
  const r = resolveJobLocation({
    jobLocation: "Germany",
    title: "Software Engineer Remote",
    headquarters: "Berlin, Germany",
    countryIso2: "DE",
    isRemote: "true",
  })
  assert.equal(r.location, "Remote")
  assert.equal(isRemoteFlag("true", ""), true)
})

test("format line adds HQ when it differs", () => {
  assert.equal(
    formatLocationLine({ location: "Düsseldorf", headquarters: "Munich", usedHeadquarters: false }),
    "Düsseldorf · HQ Munich",
  )
  assert.equal(
    formatLocationLine({ location: "Germany", headquarters: "Germany", usedHeadquarters: true }),
    "Germany",
  )
})

test("extractCity finds Munich in a company name", () => {
  assert.equal(extractCity("Diakonie München und Oberbayern"), "München")
})

test("software hardware and AI are their own categories", () => {
  assert.ok(extractSpecialties("Software Engineer / Digital Assets Exchange").includes("software"))
  assert.ok(extractSpecialties("FPGA Hardware Engineer").includes("hardware"))
  assert.ok(extractSpecialties("Machine Learning Engineer").includes("ai"))
  assert.equal(specialtyLabel("software"), "Software engineering")
  assert.equal(specialtyLabel("hardware", "de"), "Hardwareentwicklung")
  assert.equal(specialtyLabel("ai", "fr"), "Intelligence artificielle")
})

test("every non-empty title gets at least one real category", () => {
  assert.deepEqual(extractSpecialties("Aushilfe (m/w/d)"), ["general"])
  assert.ok(extractSpecialties("completely unknown role xyz").includes("general"))
  assert.deepEqual(extractSpecialties(""), ["weitere"])
})

test("Czech and Dutch leftovers classify after accent folding", () => {
  assert.ok(extractSpecialties("Skladníci, obsluha manipulačních vozíků").includes("lager"))
  assert.ok(extractSpecialties("Kuchaři studené kuchyně").includes("gastronomie"))
  assert.ok(extractSpecialties("Vývojáři softwaru").includes("software"))
  assert.ok(extractSpecialties("huishoudelijke hulp").includes("reinigung"))
  assert.ok(extractSpecialties("hovenier").includes("garten"))
  assert.ok(extractSpecialties("accountmanager").includes("vertrieb"))
  assert.ok(extractSpecialties("Zedníci").includes("bau"))
  assert.ok(extractSpecialties("Lasser").includes("fertigung"))
  assert.ok(extractSpecialties("Beveiliger").includes("sicherheit"))
  assert.ok(extractSpecialties("Klantenservice Medewerker").includes("kundenservice"))
  assert.ok(extractSpecialties("Intensivpfleger*in (m/w/d)").includes("pflege"))
  assert.ok(extractSpecialties("Baggerfahrer (m/w/d)").includes("bau"))
  assert.ok(extractSpecialties("Leerkracht Basisonderwijs").includes("erziehung"))
})
