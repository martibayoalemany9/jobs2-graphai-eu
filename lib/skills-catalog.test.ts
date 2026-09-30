import assert from "node:assert/strict"
import test from "node:test"
import { CATALOG_LOCALES, extractSpecialties, SKILL_CATALOG, specialtyLabel } from "./skills-catalog"

test("retail and warehouse titles map to occupation fields", () => {
  assert.ok(extractSpecialties("Verkäufer (m/w/d) Teilzeit").includes("einzelhandel"))
  assert.ok(extractSpecialties("Staplerfahrer (m/w/d)").includes("lager"))
  assert.ok(extractSpecialties("Produktionsmitarbeiter (m/w/d)").includes("produktion"))
  assert.ok(extractSpecialties("Fachkraft für Lagerlogistik (m/w/d)").includes("lager"))
})

test("software engineer is software, IT and engineering", () => {
  const ids = extractSpecialties("Software Engineer / Technology Lead")
  assert.ok(ids.includes("software"))
  assert.ok(ids.includes("it"))
  assert.ok(ids.includes("ingenieurwesen"))
})

test("telecom functions map into Information Technology, Telecommunications", () => {
  assert.ok(extractSpecialties("Telecommunications Engineer").includes("it"))
  assert.ok(extractSpecialties("Nachrichtentechniker (m/w/d)").includes("it"))
  assert.ok(extractSpecialties("Network Engineer Muscat").includes("it"))
  assert.ok(extractSpecialties("RF Engineer 5G").includes("it"))
  assert.ok(extractSpecialties("NOC Engineer VSAT").includes("it"))
  assert.equal(specialtyLabel("it"), "Information Technology, Telecommunications")
  assert.equal(specialtyLabel("it", "de"), "Informationstechnik, Telekommunikation")
})

test("unmatched titles land in general labor, never uncategorized", () => {
  assert.deepEqual(extractSpecialties("Aushilfe (m/w/d)"), ["general"])
  assert.equal(extractSpecialties("completely unknown role xyz").includes("uncategorized"), false)
  assert.equal(specialtyLabel("uncategorized"), "Other")
  assert.equal(specialtyLabel("uncategorized", "de"), "Weitere")
  assert.equal(extractSpecialties("Lagerhelfer (m/w/d)").includes("general"), false)
  assert.ok(extractSpecialties("Lagerhelfer (m/w/d)").includes("lager"))
})

test("new occupation fields pull leftover titles out of Weitere", () => {
  assert.ok(extractSpecialties("Reinigungskraft (m/w/d)").includes("reinigung"))
  assert.ok(extractSpecialties("Pflegefachkraft (m/w/d)").includes("pflege"))
  assert.ok(extractSpecialties("Erzieher (m/w/d)").includes("erziehung"))
  assert.ok(extractSpecialties("Kuchař/ka").includes("gastronomie"))
  assert.ok(extractSpecialties("Dělníci v oblasti výstavby a údržby budov").includes("bau"))
  assert.ok(extractSpecialties("Transportation Security Officer").includes("sicherheit"))
  assert.ok(extractSpecialties("Museumskurator (m/w/d)").includes("kunst"))
  assert.ok(extractSpecialties("Schauspielerin Musicaldarstellerin").includes("theater"))
  assert.ok(extractSpecialties("Konferenzdolmetscher (m/w/d)").includes("dolmetschen"))
  assert.ok(extractSpecialties("Policy Officer Public Affairs").includes("politik"))
  assert.ok(extractSpecialties("Patent Examiner EPO").includes("patent"))
  assert.ok(extractSpecialties("Patent Officer USPTO").includes("patent"))
  assert.ok(extractSpecialties("Patent researcher prior art search").includes("patent"))
  assert.ok(extractSpecialties("Patentanwalt (m/w/d) Elektrotechnik").includes("patent"))
  assert.ok(extractSpecialties("Patentingenieur / Technischer Experte").includes("patent"))
  assert.ok(extractSpecialties("Europees Octrooigemachtigde").includes("patent"))
  assert.ok(extractSpecialties("Conseil en brevets").includes("patent"))
  assert.ok(extractSpecialties("Business Analyst").includes("analyse"))
})

test("occupation labels default to English and switch locale", () => {
  assert.equal(specialtyLabel("produktion"), "Production")
  assert.equal(specialtyLabel("fertigung"), "Manufacturing")
  assert.equal(specialtyLabel("instandhaltung"), "Maintenance")
  assert.equal(specialtyLabel("lager"), "Warehouse")
  assert.equal(specialtyLabel("transport"), "Transport")
  assert.equal(specialtyLabel("einzelhandel"), "Retail")
  assert.equal(specialtyLabel("vertrieb"), "Sales")
  assert.equal(specialtyLabel("marketing"), "Marketing")
  assert.equal(specialtyLabel("produkt"), "Product management")
  assert.equal(specialtyLabel("ingenieurwesen"), "Engineering")
  assert.equal(specialtyLabel("forschung"), "Research")
  assert.equal(specialtyLabel("fertigung", "de"), "Fertigung")
  assert.equal(specialtyLabel("fertigung", "nl"), "Fabricage")
  assert.equal(specialtyLabel("fertigung", "fr"), "Fabrication")
  assert.equal(specialtyLabel("fertigung", "cs"), "Výroba")
  assert.equal(specialtyLabel("fertigung", "ja"), "製造")
  assert.equal(specialtyLabel("fertigung", "et"), "Tootmine")
  assert.equal(specialtyLabel("software", "ru"), "Программная инженерия")
  assert.equal(specialtyLabel("kunst", "hi"), "कला")
  assert.equal(specialtyLabel("theater", "en"), "Theater")
  assert.equal(specialtyLabel("dolmetschen", "en"), "Interpreting")
  assert.equal(specialtyLabel("politik", "en"), "Politics")
  assert.equal(specialtyLabel("patent", "en"), "Patents")
  assert.equal(specialtyLabel("weitere", "en"), "Other")
  assert.equal(specialtyLabel("weitere", "de"), "Weitere")
  assert.equal(specialtyLabel("weitere", "nl"), "Overig")
  assert.equal(specialtyLabel("weitere", "fr"), "Autre")
  for (const sk of SKILL_CATALOG) {
    for (const loc of CATALOG_LOCALES) {
      assert.ok(specialtyLabel(sk.id, loc), `${sk.id} missing ${loc}`)
    }
    assert.equal(specialtyLabel(sk.id, "en"), sk.label)
  }
})

test("the four large buckets split into specific fields", () => {
  assert.ok(extractSpecialties("Industriemechaniker (m/w/d)").includes("fertigung"))
  assert.ok(extractSpecialties("Elektroniker (m/w/d)").includes("instandhaltung"))
  assert.ok(extractSpecialties("LKW-Fahrer (m/w/d)").includes("transport"))
  assert.ok(extractSpecialties("Product Manager").includes("produkt"))
  assert.ok(extractSpecialties("Marketing Manager").includes("marketing"))
  assert.ok(extractSpecialties("Account Manager").includes("vertrieb"))
  assert.ok(extractSpecialties("Wissenschaftlicher Mitarbeiter Forschung").includes("forschung"))
})

test("one job can have many categories", () => {
  const ids = extractSpecialties("Quality Engineer / Qualitätsmanagement in der Fertigung")
  assert.ok(ids.includes("qualitaet"))
  assert.ok(ids.includes("fertigung") || ids.includes("ingenieurwesen"))
})
