import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ALL_COUNTRIES,
  countryLabel,
  isAllCountries,
  isCountryScope,
  isIso2,
  parseCountryScope,
} from "./country"

describe("country scope", () => {
  it("treats ALL as worldwide employment, not an ISO2", () => {
    assert.equal(isIso2(ALL_COUNTRIES), false)
    assert.equal(isAllCountries("all"), true)
    assert.equal(isAllCountries("DE"), false)
    assert.equal(isCountryScope("ALL"), true)
    assert.equal(isCountryScope("DE"), true)
    assert.equal(isCountryScope("deu"), false)
    assert.equal(isCountryScope(""), false)
  })

  it("parses ALL and ISO2, rejects junk", () => {
    assert.deepEqual(parseCountryScope("all"), { all: true, iso2: "ALL" })
    assert.deepEqual(parseCountryScope("de"), { all: false, iso2: "DE" })
    assert.equal(parseCountryScope(""), null)
    assert.equal(parseCountryScope("DEU"), null)
  })

  it("labels ALL in EN DE NL FR CS JA ET RU", () => {
    assert.equal(countryLabel("ALL"), "All countries")
    assert.equal(countryLabel("ALL", "de"), "Alle Länder")
    assert.equal(countryLabel("ALL", "nl"), "Alle landen")
    assert.equal(countryLabel("ALL", "fr"), "Tous les pays")
    assert.equal(countryLabel("ALL", "cs"), "Všechny země")
    assert.equal(countryLabel("ALL", "ja"), "すべての国")
    assert.equal(countryLabel("ALL", "et"), "Kõik riigid")
    assert.equal(countryLabel("ALL", "ru"), "Все страны")
    assert.equal(countryLabel("DE"), "Germany")
    assert.equal(countryLabel("KR"), "South Korea")
    assert.equal(countryLabel("PH"), "Philippines")
    assert.equal(countryLabel("AR"), "Argentina")
    assert.equal(countryLabel("HI"), "Hawaii")
    assert.equal(countryLabel("HI", "ja"), "ハワイ")
    assert.equal(countryLabel("HI", "hi"), "हवाई")
    assert.equal(countryLabel("OM"), "Oman")
    assert.equal(countryLabel("OM", "de"), "Oman")
  })
})
