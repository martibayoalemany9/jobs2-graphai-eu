import assert from "node:assert/strict"
import test from "node:test"
import {
  catalogRowMatchesSkill,
  extractSkillTags,
  skillTagLabel,
  SKILL_TAGS,
} from "./skill-tags"

test("Deutschland in a title is not the German language skill", () => {
  const ids = extractSkillTags("Mitarbeiter Zählerdatenerfassung DIS AG Germany")
  assert.equal(ids.includes("german"), false)
})

test("original German warehouse titles tag forklift, not Java", () => {
  const ids = extractSkillTags("Staplerfahrer (m/w/d) Getränkebranche")
  assert.ok(ids.includes("forklift"))
  assert.equal(ids.includes("java"), false)
})

test("Java and Spring Boot description tags Java", () => {
  const ids = extractSkillTags(
    "Experienced Backend Developer (Java, Spring Boot, Kafka). Kenntnisse in Java und Kafka erforderlich.",
  )
  assert.ok(ids.includes("java"))
  assert.ok(ids.includes("kafka"))
  assert.equal(ids.includes("javascript"), false)
})

test("javascript does not count as java", () => {
  const ids = extractSkillTags("Frontend Engineer JavaScript React TypeScript")
  assert.ok(ids.includes("javascript"))
  assert.ok(ids.includes("react"))
  assert.ok(ids.includes("typescript"))
  assert.equal(ids.includes("java"), false)
})

test("SAP SD original English description", () => {
  const ids = extractSkillTags(
    "For our Solution Engineering team we're looking for an SAP SD developer/consultant. SAP is where the majority of that data lives.",
  )
  assert.ok(ids.includes("sap"))
  assert.ok(ids.includes("sap_sd"))
})

test("HTML is stripped before matching", () => {
  const ids = extractSkillTags('<p>Senior Software Engineer with focus on <strong>Python</strong></p>')
  assert.ok(ids.includes("python"))
})

test("skill labels switch locale for forklift", () => {
  assert.equal(skillTagLabel("forklift"), "Forklift")
  assert.equal(skillTagLabel("forklift", "de"), "Stapler")
  assert.equal(skillTagLabel("forklift", "nl"), "Heftruck")
  assert.equal(skillTagLabel("java"), "Java")
})

test("catalog Java cert matches java skill", () => {
  assert.ok(
    catalogRowMatchesSkill(
      {
        cert_id: "ocp-java",
        certification_name: "Oracle Certified Professional: Java SE",
        skill_regex: "\\bjava\\b|spring boot",
      },
      "java",
    ),
  )
  assert.ok(
    catalogRowMatchesSkill(
      {
        cert_id: "occ-dguv-staplerschein",
        certification_name: "DGUV Flurfördermittelschein (Gabelstaplerschein)",
        skill_regex: "staplerfahrer|gabelstaplerfahrer|heftruck",
      },
      "forklift",
    ),
  )
  assert.equal(
    catalogRowMatchesSkill(
      { cert_id: "aws-saa", certification_name: "AWS Certified Solutions Architect", skill_regex: "\\baws\\b" },
      "java",
    ),
    false,
  )
})

test("bare Dutch rust or rustige is not the Rust language", () => {
  assert.equal(extractSkillTags("Begeleider N4 rustige groep").includes("rust"), false)
  assert.ok(extractSkillTags("Senior Rust Engineer (m/w/d)").includes("rust"))
})

test("generic lassen verb is not welding", () => {
  assert.equal(extractSkillTags("Laten we samen koken in de keuken").includes("welding"), false)
  assert.ok(extractSkillTags("Schweißer (m/w/d) Metallbau").includes("welding"))
  assert.ok(extractSkillTags("Lasser MAG/TIG").includes("welding"))
})

test("catalog has unique skill ids", () => {
  const ids = SKILL_TAGS.map((s) => s.id)
  assert.equal(ids.length, new Set(ids).size)
})
