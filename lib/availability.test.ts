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
  it("parses available and not available", () => {
    assert.equal(parseAvailability("available"), "available")
    assert.equal(parseAvailability("Not available"), "probably_unavailable")
    assert.equal(parseAvailability("unavailable"), "probably_unavailable")
    assert.equal(parseAvailability("probably_unavailable"), "probably_unavailable")
    assert.equal(parseAvailability("all"), "all")
    assert.equal(parseAvailability(""), "all")
    assert.equal(isAvailability("available"), true)
    assert.equal(isAvailability("DE"), false)
  })

  it("picks the matching employment count", () => {
    assert.equal(availabilityCount(100, 80, 20, "all"), 100)
    assert.equal(availabilityCount(100, 80, 20, "available"), 80)
    assert.equal(availabilityCount(100, 80, 20, "probably_unavailable"), 20)
    assert.equal(seriesCount({ n_total: 10, n_available: 7, n_unavailable: 3 }, "available"), 7)
  })

  it("labels Available and Not available", () => {
    assert.equal(availabilityLabel("available"), "Available")
    assert.equal(availabilityLabel("probably_unavailable"), "Not available")
    assert.equal(availabilityLabel("probably_unavailable", "de"), "Nicht verfügbar")
  })
})
