import assert from "node:assert/strict"
import test from "node:test"
import { extractSpecialties, specialtyLabel } from "./skills-catalog"

test("retail and warehouse titles map to occupation fields", () => {
  assert.ok(extractSpecialties("Verkäufer (m/w/d) Teilzeit").includes("einzelhandel"))
  assert.ok(extractSpecialties("Staplerfahrer (m/w/d)").includes("lager"))
  assert.ok(extractSpecialties("Produktionsmitarbeiter (m/w/d)").includes("produktion"))
  assert.ok(extractSpecialties("Fachkraft für Lagerlogistik (m/w/d)").includes("lager"))
})

test("software engineer is IT and engineering", () => {
  const ids = extractSpecialties("Software Engineer / Technology Lead")
  assert.ok(ids.includes("it"))
  assert.ok(ids.includes("ingenieurwesen"))
})

test("unmatched titles land in Weitere, never uncategorized", () => {
  assert.deepEqual(extractSpecialties("Aushilfe (m/w/d)"), ["weitere"])
  assert.equal(extractSpecialties("completely unknown role xyz").includes("uncategorized"), false)
  assert.equal(specialtyLabel("uncategorized"), "Weitere")
})

test("new occupation fields pull leftover titles out of Weitere", () => {
  assert.ok(extractSpecialties("Reinigungskraft (m/w/d)").includes("reinigung"))
  assert.ok(extractSpecialties("Pflegefachkraft (m/w/d)").includes("pflege"))
  assert.ok(extractSpecialties("Erzieher (m/w/d)").includes("erziehung"))
  assert.ok(extractSpecialties("Kuchař/ka").includes("gastronomie"))
  assert.ok(extractSpecialties("Dělníci v oblasti výstavby a údržby budov").includes("bau"))
  assert.ok(extractSpecialties("Transportation Security Officer").includes("sicherheit"))
})

test("the four large buckets split into specific fields", () => {
  assert.equal(specialtyLabel("produktion"), "Produktion")
  assert.equal(specialtyLabel("fertigung"), "Fertigung")
  assert.equal(specialtyLabel("instandhaltung"), "Instandhaltung")
  assert.equal(specialtyLabel("lager"), "Lager")
  assert.equal(specialtyLabel("transport"), "Transport")
  assert.equal(specialtyLabel("einzelhandel"), "Einzelhandel")
  assert.equal(specialtyLabel("vertrieb"), "Vertrieb")
  assert.equal(specialtyLabel("marketing"), "Marketing")
  assert.equal(specialtyLabel("produkt"), "Produktmanagement")
  assert.equal(specialtyLabel("ingenieurwesen"), "Ingenieurwesen")
  assert.equal(specialtyLabel("forschung"), "Forschung")
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
