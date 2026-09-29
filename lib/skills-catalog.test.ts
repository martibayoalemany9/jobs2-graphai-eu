import assert from "node:assert/strict"
import test from "node:test"
import { extractSpecialties, specialtyLabel } from "./skills-catalog"

test("retail and warehouse titles map to occupation fields", () => {
  assert.deepEqual(extractSpecialties("Verkäufer (m/w/d) Teilzeit"), ["vertrieb"])
  assert.ok(extractSpecialties("Staplerfahrer (m/w/d)").includes("logistik"))
  assert.ok(extractSpecialties("Produktionsmitarbeiter (m/w/d)").includes("produktion"))
  assert.ok(extractSpecialties("Fachkraft für Lagerlogistik (m/w/d)").includes("logistik"))
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

test("core combined occupation labels", () => {
  assert.equal(specialtyLabel("produktion"), "Produktion und Fertigung")
  assert.equal(specialtyLabel("logistik"), "Logistik")
  assert.equal(specialtyLabel("vertrieb"), "Vertrieb, Marketing und Produktmanagement")
  assert.equal(specialtyLabel("ingenieurwesen"), "Ingenieurwesen und Forschung")
  assert.ok(extractSpecialties("Product Manager").includes("vertrieb"))
  assert.ok(extractSpecialties("Marketing Manager").includes("vertrieb"))
  assert.ok(extractSpecialties("Industriemechaniker (m/w/d)").includes("produktion"))
})

test("one job can have many categories", () => {
  const ids = extractSpecialties("Quality Engineer / Qualitätsmanagement in der Fertigung")
  assert.ok(ids.includes("qualitaet"))
  assert.ok(ids.includes("produktion") || ids.includes("ingenieurwesen"))
})
