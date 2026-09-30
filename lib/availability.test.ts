import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  availabilityCount,
  availabilityLabel,
  isAvailability,
  parseAvailability,
  seriesCount,
} from "./availability"

describe("availability", () => {
  it("parses open and closed to applications", () => {
    assert.equal(parseAvailability("available"), "available")
    assert.equal(parseAvailability("open"), "available")
    assert.equal(parseAvailability("open to applications"), "available")
    assert.equal(parseAvailability("closed"), "probably_unavailable")
    assert.equal(parseAvailability("close"), "probably_unavailable")
    assert.equal(parseAvailability("close to applications"), "probably_unavailable")
    assert.equal(parseAvailability("Not available"), "probably_unavailable")
    assert.equal(parseAvailability("unavailable"), "probably_unavailable")
    assert.equal(parseAvailability("probably_unavailable"), "probably_unavailable")
    assert.equal(parseAvailability("all"), "available")
    assert.equal(parseAvailability(""), "available")
    assert.equal(isAvailability("available"), true)
    assert.equal(isAvailability("all"), false)
    assert.equal(isAvailability("DE"), false)
  })

  it("picks the matching employment count", () => {
    assert.equal(availabilityCount(100, 80, 20, "available"), 80)
    assert.equal(availabilityCount(100, 80, 20, "probably_unavailable"), 20)
    assert.equal(seriesCount({ n_total: 10, n_available: 7, n_unavailable: 3 }, "available"), 7)
  })

  it("labels open and closed to applications", () => {
    assert.equal(availabilityLabel("available"), "Open to applications")
    assert.equal(availabilityLabel("probably_unavailable"), "Closed to applications")
    assert.equal(availabilityLabel("probably_unavailable", "de"), "Geschlossen für Bewerbungen")
    assert.equal(availabilityLabel("available", "ja"), "応募受付中")
    assert.equal(availabilityLabel("available", "et"), "Avatud kandideerimiseks")
    assert.equal(availabilityLabel("available", "ru"), "Открыто для откликов")
    assert.equal(availabilityLabel("available", "cs"), "Otevřeno pro přihlášky")
  })
})
