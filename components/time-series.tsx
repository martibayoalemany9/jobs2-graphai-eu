"use client"

import { seriesCount, type Availability } from "@/lib/availability"
import type { SpikePick } from "@/lib/spike-series"
import { useAvailabilityLabel, useSpecialtyLabel } from "./catalog-locale"

export type SeriesPoint = { d: string; n_total: number; n_available: number; n_unavailable: number }
export type KpiPoint = { year_month: string; unemployment_rate: number; source: string }
export type SpikeOverlay = Pick<SpikePick, "specialty" | "series" | "latestDelta" | "score" | "reason">

export function TimeSeries({
  series,
  kpi,
  spike = null,
  availability = "all",
}: {
  series: SeriesPoint[]
  kpi: KpiPoint[]
  spike?: SpikeOverlay | null
  availability?: Availability
}) {
  const availOf = useAvailabilityLabel()
  const labelOf = useSpecialtyLabel()
  const w = 640
  const h = 180
  const pad = 28
  const rows = series.length === 1 ? [series[0], series[0]] : series
  const max = Math.max(1, ...rows.map((s) => seriesCount(s, availability)))
  const pts = rows.map((s, i) => {
    const x = pad + (i / Math.max(1, rows.length - 1)) * (w - pad * 2)
    const y = h - pad - (seriesCount(s, availability) / max) * (h - pad * 2)
    return `${x},${y}`
  })
  const kpiMax = Math.max(1, ...kpi.map((k) => k.unemployment_rate))
  const kpiPts = kpi
    .slice()
    .reverse()
    .map((k, i, arr) => {
      const x = pad + (i / Math.max(1, arr.length - 1)) * (w - pad * 2)
      const y = h - pad - (k.unemployment_rate / kpiMax) * (h - pad * 2)
      return `${x},${y}`
    })
  const spikeByDate = new Map((spike?.series || []).map((s) => [s.d, s]))
  let lastSpike = 0
  const spikeVals = rows.map((s) => {
    const hit = spikeByDate.get(s.d)
    if (hit) lastSpike = seriesCount(hit, availability)
    return lastSpike
  })
  const spikeMax = Math.max(1, ...spikeVals)
  const spikePts =
    spike && spikeVals.some((n) => n > 0)
      ? rows.map((s, i) => {
          const x = pad + (i / Math.max(1, rows.length - 1)) * (w - pad * 2)
          const y = h - pad - (spikeVals[i] / spikeMax) * (h - pad * 2)
          return `${x},${y}`
        })
      : []
  const latest = series[series.length - 1]
  const latestN = latest ? seriesCount(latest, availability) : 0
  const jobsLegend = availability === "all" ? "Jobs found" : availOf(availability)
  const spikeLabel = spike ? labelOf(spike.specialty) : ""
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-extrabold tracking-tight">Jobs over time</h2>
      <p className="text-sm text-muted">
        Solid line is {availability === "all" ? "job count" : `${availOf(availability).toLowerCase()} job count`}
        {latest ? ` · ${latestN.toLocaleString()} current` : ""}. Dashed overlay is unemployment (Eurostat / World Bank).
        {spike ? ` Orange line is ${spikeLabel} after a large day-to-day change.` : ""}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" role="img" aria-label="Job count time series" data-testid="time-series">
        {pts.length ? <polyline fill="none" stroke="#1b8f4a" strokeWidth="2.4" points={pts.join(" ")} /> : null}
        {spikePts.length > 1 ? (
          <polyline fill="none" stroke="#d97706" strokeWidth="2" points={spikePts.join(" ")} data-testid="series-spike-line" />
        ) : null}
        {kpiPts.length > 1 && (
          <polyline fill="none" stroke="#7a5c20" strokeWidth="1.6" strokeDasharray="5 4" points={kpiPts.join(" ")} />
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-muted" data-testid="kpi-legend">
        <span data-testid="series-jobs-legend">{jobsLegend}</span>
        {spike ? (
          <span data-testid="series-spike-legend" className="text-[#d97706]">
            {spikeLabel}
          </span>
        ) : null}
        <span>Unemployment</span>
      </div>
    </section>
  )
}
