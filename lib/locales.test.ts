import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CATALOG_LOCALES,
  CATALOG_LOCALE_BUTTONS,
  parseCatalogLocale,
  L,
  localePick,
} from "./locales"
import { uiCopy, mapMetricCopy } from "./ui-copy"

describe("catalog locales", () => {
  it("includes Japanese, Estonian, Russian and Czech", () => {
    assert.deepEqual([...CATALOG_LOCALES], ["en", "de", "nl", "fr", "cs", "ja", "et", "ru", "hi"])
    const ids = CATALOG_LOCALE_BUTTONS.map((b) => b.id)
    assert.ok(ids.includes("ja"))
    assert.ok(ids.includes("et"))
    assert.ok(ids.includes("ru"))
    assert.ok(ids.includes("cs"))
    assert.ok(ids.includes("hi"))
  })

  it("parses aliases and BCP47 prefixes", () => {
    assert.equal(parseCatalogLocale("cz"), "cs")
    assert.equal(parseCatalogLocale("jp"), "ja")
    assert.equal(parseCatalogLocale("ee"), "et")
    assert.equal(parseCatalogLocale("ja-JP"), "ja")
    assert.equal(parseCatalogLocale("ru-RU"), "ru")
    assert.equal(parseCatalogLocale("et-EE"), "et")
    assert.equal(parseCatalogLocale("hi"), "hi")
    assert.equal(parseCatalogLocale("hi-IN"), "hi")
    assert.equal(parseCatalogLocale("in"), "hi")
    assert.equal(parseCatalogLocale("nope"), "en")
  })

  it("picks locale strings including JA ET RU", () => {
    const row = L("EN", "DE", "NL", "FR", "CS", "JA", "ET", "RU", "HI")
    assert.equal(localePick(row, "ja"), "JA")
    assert.equal(localePick(row, "et"), "ET")
    assert.equal(localePick(row, "ru"), "RU")
    assert.equal(localePick(row, "hi"), "HI")
    assert.equal(uiCopy("ja", "tab_jobs"), "求人")
    assert.equal(uiCopy("et", "tab_jobs"), "Tööpakkumised")
    assert.equal(uiCopy("ru", "tab_jobs"), "Вакансии")
    assert.equal(uiCopy("cs", "report_title"), "Požádat o smazání nebo opravu")
    assert.equal(uiCopy("hi", "tab_jobs"), "नौकरियाँ")
    assert.equal(uiCopy("hi", "tab_map"), "मानचित्र")
    assert.equal(mapMetricCopy("jobs", "ja"), "求人数")
    assert.equal(uiCopy("en", "board_diff_title"), "Compare listings")
    assert.equal(uiCopy("de", "board_master"), "Master")
  })
})
