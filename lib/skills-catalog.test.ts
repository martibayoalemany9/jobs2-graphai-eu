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
  assert.deepEqual(extractSpecialties("Reinigungskraft (m/w/d)"), ["weitere"])
  assert.equal(extractSpecialties("completely unknown role xyz").includes("uncategorized"), false)
  assert.equal(specialtyLabel("uncategorized"), "Weitere")
})

test("one job can have many categories", () => {
  const ids = extractSpecialties("Quality Engineer / Qualitätsmanagement in der Fertigung")
  assert.ok(ids.includes("qualitaet"))
  assert.ok(ids.includes("produktion") || ids.includes("ingenieurwesen"))
})
