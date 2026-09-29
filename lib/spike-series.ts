/** Pick one occupation series to overlay when day-to-day change is very large. */

export type SeriesPoint = { d: string; n_total: number; n_available: number; n_unavailable: number }

export type SpecialtySeries = {
  specialty: string
  points: SeriesPoint[]
}

export const SPIKE_SKIP = new Set(["*", "weitere", "uncategorized", "general"])

export type SpikeReason = "lift" | "ratio" | "abs"

export type SpikePick = {
  specialty: string
  series: SeriesPoint[]
  latestDelta: number
  score: number
  reason: SpikeReason
}

export type SpikeOptions = {
  minAbs?: number
  minRatio?: number
  shareLift?: number
  lookback?: number
  absDumpFloor?: number
}

function dailyDeltas(points: SeriesPoint[]): number[] {
  const deltas: number[] = []
  for (let i = 1; i < points.length; i++) {
    deltas.push(points[i].n_total - points[i - 1].n_total)
  }
  return deltas
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function groupBySpecialty(
  rows: Array<SeriesPoint & { specialty: string }>,
): SpecialtySeries[] {
  const map = new Map<string, SeriesPoint[]>()
  for (const r of rows) {
    const id = r.specialty
    const pts = map.get(id) || []
    pts.push({ d: r.d, n_total: r.n_total, n_available: r.n_available, n_unavailable: r.n_unavailable })
    map.set(id, pts)
  }
  return [...map.entries()].map(([specialty, points]) => ({
    specialty,
    points: points.slice().sort((a, b) => a.d.localeCompare(b.d)),
  }))
}

export function groupSpecialtySeries(
  rows: Array<SeriesPoint & { specialty: string }>,
): SpecialtySeries[] {
  return groupBySpecialty(rows)
}

/**
 * Overlay the occupation whose recent daily change is an outlier versus its
 * own history, or whose share of that day's new jobs lifts versus its stock
 * share. Catch-all buckets (`*`, Other, general labor) are skipped. On a
 * nationwide dump day every named field jumps, so the largest absolute named
 * swing is used instead.
 */
export function pickSpikeSeries(
  total: SeriesPoint[],
  bySpecialty: SpecialtySeries[],
  opts: SpikeOptions = {},
): SpikePick | null {
  const minAbs = opts.minAbs ?? 250
  const minRatio = opts.minRatio ?? 4
  const shareLift = opts.shareLift ?? 1.75
  const lookback = opts.lookback ?? 2
  const absDumpFloor = opts.absDumpFloor ?? 5000

  const totals = total.slice().sort((a, b) => a.d.localeCompare(b.d))
  if (totals.length < 3) return null
  const totalDeltas = dailyDeltas(totals)
  const lookStart = Math.max(0, totalDeltas.length - lookback)
  const recentTotalNew = totalDeltas.slice(lookStart).reduce((a, b) => a + Math.max(0, b), 0)
  const stockTotal = totals[totals.length - 1]?.n_total || 0

  const cands: SpikePick[] = []
  for (const spec of bySpecialty) {
    const id = String(spec.specialty || "").toLowerCase()
    if (SPIKE_SKIP.has(id)) continue
    const pts = spec.points.slice().sort((a, b) => a.d.localeCompare(b.d))
    if (pts.length < 3) continue
    const deltas = dailyDeltas(pts)
    if (!deltas.length) continue
    const abs = deltas.map((x) => Math.abs(x))
    const nonzero = abs.filter((x) => x > 0)
    const med = median(nonzero.length ? nonzero : abs)
    const recentAbs = abs.slice(Math.max(0, abs.length - lookback))
    const maxRecentAbs = Math.max(0, ...recentAbs)
    const latestDelta = deltas[deltas.length - 1] ?? 0
    const specRecentNew = deltas
      .slice(Math.max(0, deltas.length - lookback))
      .reduce((a, b) => a + Math.max(0, b), 0)
    const specStock = pts[pts.length - 1]?.n_total || 0
    const specPct = recentTotalNew > 0 ? specRecentNew / recentTotalNew : 0
    const stockShare = stockTotal > 0 ? specStock / stockTotal : 0
    const lift = stockShare > 0 ? specPct / stockShare : 0

    let reason: SpikeReason | null = null
    let score = 0
    if (lift >= shareLift && specRecentNew >= minAbs) {
      reason = "lift"
      score = lift * specRecentNew
    } else if (med > 0 && maxRecentAbs / med >= minRatio && maxRecentAbs >= minAbs) {
      reason = "ratio"
      score = (maxRecentAbs / med) * maxRecentAbs
    } else if (maxRecentAbs >= absDumpFloor) {
      reason = "abs"
      score = maxRecentAbs
    }
    if (reason) {
      cands.push({ specialty: spec.specialty, series: pts, latestDelta, score, reason })
    }
  }
  if (!cands.length) return null
  cands.sort((a, b) => b.score - a.score || Math.abs(b.latestDelta) - Math.abs(a.latestDelta))
  return cands[0]
}
