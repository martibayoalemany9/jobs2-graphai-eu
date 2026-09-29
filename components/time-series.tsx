"use client"

export type SeriesPoint = { d: string; n_total: number; n_available: number; n_unavailable: number }
export type KpiPoint = { year_month: string; unemployment_rate: number; source: string }

export function TimeSeries({ series, kpi }: { series: SeriesPoint[]; kpi: KpiPoint[] }) {
  const w = 640
  const h = 180
  const pad = 28
  const rows = series.length === 1 ? [series[0], series[0]] : series
  const max = Math.max(1, ...rows.map((s) => s.n_total))
  const pts = rows.map((s, i) => {
    const x = pad + (i / Math.max(1, rows.length - 1)) * (w - pad * 2)
    const y = h - pad - (s.n_total / max) * (h - pad * 2)
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
  const latest = series[series.length - 1]
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-extrabold tracking-tight">Jobs over time</h2>
      <p className="text-sm text-muted">
        Solid line is job count
        {latest ? ` · ${latest.n_total.toLocaleString()} current` : ""}. Dashed overlay is unemployment (Eurostat / World Bank).
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" role="img" aria-label="Job count time series" data-testid="time-series">
        {pts.length ? <polyline fill="none" stroke="#1b8f4a" strokeWidth="2.4" points={pts.join(" ")} /> : null}
        {kpiPts.length > 1 && (
          <polyline fill="none" stroke="#7a5c20" strokeWidth="1.6" strokeDasharray="5 4" points={kpiPts.join(" ")} />
        )}
      </svg>
      <div className="mt-2 flex gap-4 text-xs font-semibold text-muted" data-testid="kpi-legend">
        <span>Jobs found</span>
        <span>Unemployment</span>
      </div>
    </section>
  )
}
