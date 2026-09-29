"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { countryLabel } from "@/lib/country"
import { MAP_METRICS, type CountryStats, type MapMetric } from "./leaflet-map"
import { MapProgress } from "./map-progress"

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="relative h-[420px] w-full">
      <MapProgress value={12} label="Loading world map" />
    </div>
  ),
})

function metricValue(c: CountryStats | undefined, metric: MapMetric): number {
  if (!c) return 0
  if (metric === "jobs") return c.n_total
  if (metric === "companies") return c.n_companies
  if (metric === "newMonth") return c.n_this_month
  if (metric === "remotePct") return Math.round(c.remote_share * 1000) / 10
  return Math.round(c.senior_share * 1000) / 10
}

export function MapStudio({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryStats[]
  selected: string
  onSelect: (iso2: string) => void
}) {
  const [metric, setMetric] = useState<MapMetric>("jobs")
  const stats = useMemo(() => Object.fromEntries(countries.map((c) => [c.iso2, c])), [countries])
  const totals = useMemo(() => {
    const nJobs = countries.reduce((s, c) => s + c.n_total, 0)
    const nCos = countries.reduce((s, c) => s + c.n_companies, 0)
    const listed = countries.reduce((s, c) => s + c.n_visible, 0)
    return { nJobs, nCos, listed, nCountries: countries.length }
  }, [countries])
  const current = stats[selected]
  const unit = MAP_METRICS.find((m) => m.id === metric)?.unit || ""

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="overflow-hidden rounded-xl border border-border bg-map-ocean">
        <div className="bg-surface px-4 py-3">
          <h2 className="text-lg font-extrabold tracking-tight">World map</h2>
          <p className="text-sm text-muted">Colour by metric, pan and zoom, then click a country for its jobs.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MAP_METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() => setMetric(m.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  metric === m.id ? "bg-studio text-primary-foreground" : "bg-mint text-foreground hover:bg-pill"
                }`}
                data-testid={m.id === "newMonth" ? "metric-this-month" : undefined}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <LeafletMap stats={stats} metric={metric} selected={selected} onSelect={onSelect} />
        <div className="bg-surface px-4 py-3 text-xs text-muted">
          <span className="font-semibold text-foreground">{MAP_METRICS.find((m) => m.id === metric)?.label}</span>
          <ul className="mt-1 flex flex-wrap gap-3">
            <li>No data</li>
            <li className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm" style={{ background: "var(--map-1)" }} /> low</li>
            <li className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm" style={{ background: "var(--map-6)" }} /> high</li>
          </ul>
        </div>
      </section>
      <aside className="rounded-xl border border-border bg-surface p-4" data-testid="map-stats">
        <p className="text-sm font-bold">Country</p>
        <select
          className="mt-1 w-full rounded-md border border-border bg-pill px-2 py-2 text-sm"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          data-testid="country-select"
        >
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {countryLabel(c.iso2)} · {c.n_total.toLocaleString()}
            </option>
          ))}
        </select>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Countries</dt>
            <dd className="text-xl font-extrabold">{totals.nCountries}</dd>
          </div>
          <div>
            <dt className="text-muted">Jobs found</dt>
            <dd className="text-xl font-extrabold">{totals.nJobs.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted">Companies</dt>
            <dd className="text-xl font-extrabold">{totals.nCos.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted">Listed roles</dt>
            <dd className="text-xl font-extrabold">{totals.listed.toLocaleString()}</dd>
          </div>
        </dl>
        {current ? (
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="font-extrabold">{countryLabel(selected)}</p>
            <p className="mt-1 text-muted">
              {MAP_METRICS.find((m) => m.id === metric)?.label}: {metricValue(current, metric).toLocaleString()}
              {unit ? ` ${unit}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Click a filled country on the map.</p>
        )}
      </aside>
    </div>
  )
}
