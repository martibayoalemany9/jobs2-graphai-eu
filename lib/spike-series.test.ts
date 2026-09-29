import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { groupSpecialtySeries, pickSpikeSeries, type SeriesPoint } from "./spike-series"

function pts(values: Array<[string, number]>): SeriesPoint[] {
  return values.map(([d, n]) => ({ d, n_total: n, n_available: n, n_unavailable: 0 }))
}

describe("pickSpikeSeries", () => {
  it("stays quiet when every named field moves with the total", () => {
    const total = pts([
      ["2026-09-24", 10000],
      ["2026-09-25", 10800],
      ["2026-09-26", 11500],
    ])
    const software = pts([
      ["2026-09-24", 1000],
      ["2026-09-25", 1080],
      ["2026-09-26", 1150],
    ])
    assert.equal(pickSpikeSeries(total, [{ specialty: "software", points: software }]), null)
  })

  it("overlays a specialty whose recent jump is several times its own median", () => {
    const total = pts([
      ["2026-09-20", 10000],
      ["2026-09-21", 10300],
      ["2026-09-22", 10600],
      ["2026-09-23", 10900],
      ["2026-09-24", 20000],
    ])
    const ai = pts([
      ["2026-09-20", 400],
      ["2026-09-21", 430],
      ["2026-09-22", 460],
      ["2026-09-23", 490],
      ["2026-09-24", 2490],
    ])
    const pick = pickSpikeSeries(total, [{ specialty: "ai", points: ai }])
    assert.ok(pick)
    assert.equal(pick?.specialty, "ai")
    assert.equal(pick?.reason, "ratio")
    assert.equal(pick?.latestDelta, 2000)
  })

  it("uses share lift when a small field takes a large slice of new jobs", () => {
    const total = pts([
      ["2026-09-20", 100000],
      ["2026-09-21", 101000],
      ["2026-09-22", 102000],
      ["2026-09-23", 103000],
      ["2026-09-24", 106000],
    ])
    const hardware = pts([
      ["2026-09-20", 800],
      ["2026-09-21", 810],
      ["2026-09-22", 820],
      ["2026-09-23", 830],
      ["2026-09-24", 2830],
    ])
    const pick = pickSpikeSeries(total, [{ specialty: "hardware", points: hardware }])
    assert.ok(pick)
    assert.equal(pick?.specialty, "hardware")
    assert.equal(pick?.reason, "lift")
  })

  it("skips general/andere catch-alls and overlays the largest named dump swing", () => {
    const total = pts([
      ["2026-09-25", 130000],
      ["2026-09-26", 133000],
      ["2026-09-27", 608000],
    ])
    const general = pts([
      ["2026-09-25", 20000],
      ["2026-09-26", 20500],
      ["2026-09-27", 130637],
    ])
    const instandhaltung = pts([
      ["2026-09-25", 8000],
      ["2026-09-26", 8200],
      ["2026-09-27", 63319],
    ])
    const fertigung = pts([
      ["2026-09-25", 7000],
      ["2026-09-26", 7200],
      ["2026-09-27", 53068],
    ])
    const pick = pickSpikeSeries(total, [
      { specialty: "general", points: general },
      { specialty: "weitere", points: general },
      { specialty: "instandhaltung", points: instandhaltung },
      { specialty: "fertigung", points: fertigung },
    ])
    assert.ok(pick)
    assert.equal(pick?.specialty, "instandhaltung")
    assert.equal(pick?.reason, "abs")
  })

  it("needs at least three points", () => {
    const total = pts([
      ["2026-09-26", 1000],
      ["2026-09-27", 9000],
    ])
    assert.equal(
      pickSpikeSeries(total, [{ specialty: "ai", points: pts([["2026-09-26", 10], ["2026-09-27", 5000]]) }]),
      null,
    )
  })

  it("groups exploded specialty rows", () => {
    const grouped = groupSpecialtySeries([
      { specialty: "ai", d: "2026-09-26", n_total: 10, n_available: 10, n_unavailable: 0 },
      { specialty: "ai", d: "2026-09-27", n_total: 40, n_available: 40, n_unavailable: 0 },
      { specialty: "software", d: "2026-09-27", n_total: 9, n_available: 9, n_unavailable: 0 },
    ])
    assert.equal(grouped.length, 2)
    assert.equal(grouped.find((g) => g.specialty === "ai")?.points.length, 2)
  })
})
