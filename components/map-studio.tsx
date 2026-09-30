"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { availabilityCount, type Availability } from "@/lib/availability"
import { ALL_COUNTRIES } from "@/lib/country"
import { MAP_METRICS, metricValue, type CountryStats, type MapMetric } from "./leaflet-map"
import { MapProgress } from "./map-progress"
import { AvailabilityFilter } from "./availability-filter"
import { useCatalogLocale, useCountryLabel, useUiCopy } from "./catalog-locale"
import { mapMetricCopy } from "@/lib/ui-copy"

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="relative h-[420px] w-full">
      <MapProgress value={12} label="Loading world map" />
    </div>
  ),
})

export function MapStudio({
  countries,
  selected,
  onSelect,
  availability,
  onAvailability,
}: {
  countries: CountryStats[]
  selected: string
  onSelect: (iso2: string) => void
  availability: Availability
  onAvailability: (next: Availability) => void
}) {
  const [metric, setMetric] = useState<MapMetric>("jobs")
  const countryOf = useCountryLabel()
  const copy = useUiCopy()
  const { locale } = useCatalogLocale()
  const stats = useMemo(() => Object.fromEntries(countries.map((c) => [c.iso2, c])), [countries])
  const totals = useMemo(() => {
    const nJobs = countries.reduce((s, c) => s + (c.n_total || 0), 0)
    const nAvailable = countries.reduce((s, c) => s + (c.n_available || 0), 0)
    const nUnavailable = countries.reduce((s, c) => s + (c.n_unavailable || 0), 0)
    const nCos = countries.reduce((s, c) => s + c.n_companies, 0)
    const listed = countries.reduce((s, c) => s + c.n_visible, 0)
    const nThisMonth = countries.reduce((s, c) => s + c.n_this_month, 0)
    const remoteJobs = countries.reduce((s, c) => s + c.remote_share * c.n_total, 0)
    const seniorJobs = countries.reduce((s, c) => s + c.senior_share * c.n_total, 0)
    return {
      nJobs,
      nAvailable,
      nUnavailable,
      nCos,
      listed,
      nCountries: countries.length,
      nThisMonth,
      remoteJobs,
      seniorJobs,
    }
  }, [countries])
  const shownJobs = availabilityCount(totals.nJobs, totals.nAvailable, totals.nUnavailable, availability)
  const worldwide = useMemo<CountryStats>(
    () => ({
      iso2: ALL_COUNTRIES,
      n_total: totals.nJobs,
      n_visible: totals.listed,
      n_available: totals.nAvailable,
      n_unavailable: totals.nUnavailable,
      n_companies: totals.nCos,
      n_this_month: totals.nThisMonth,
      remote_share: totals.nJobs ? totals.remoteJobs / totals.nJobs : 0,
      senior_share: totals.nJobs ? totals.seniorJobs / totals.nJobs : 0,
    }),
    [totals],
  )
  const current = selected === ALL_COUNTRIES ? worldwide : stats[selected]
  const unit = MAP_METRICS.find((m) => m.id === metric)?.unit || ""

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="overflow-hidden rounded-xl border border-border bg-map-ocean">
        <div className="bg-surface px-4 py-3">
          <h2 className="text-lg font-extrabold tracking-tight">{copy("world_map")}</h2>
          <p className="text-sm text-muted">{copy("world_map_hint")}</p>
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
                {mapMetricCopy(m.id, locale)}
              </button>
            ))}
          </div>
        </div>
        <LeafletMap
          stats={stats}
          metric={metric}
          selected={selected}
          onSelect={onSelect}
          availability={availability}
        />
        <div className="bg-surface px-4 py-3 text-xs text-muted">
          <span className="font-semibold text-foreground">{mapMetricCopy(metric, locale)}</span>
          <ul className="mt-1 flex flex-wrap gap-3">
            <li>{copy("no_data")}</li>
            <li className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm" style={{ background: "var(--map-1)" }} /> {copy("low")}</li>
            <li className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm" style={{ background: "var(--map-6)" }} /> {copy("high")}</li>
          </ul>
        </div>
      </section>
      <aside className="rounded-xl border border-border bg-surface p-4" data-testid="map-stats">
        <p className="text-sm font-bold">{copy("country")}</p>
        <select
          className="mt-1 w-full rounded-md border border-border bg-pill px-2 py-2 text-sm"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          data-testid="country-select"
        >
          <option value={ALL_COUNTRIES} data-testid="all-countries-option">
            {countryOf(ALL_COUNTRIES)} · {shownJobs.toLocaleString()}
          </option>
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {countryOf(c.iso2)} · {availabilityCount(c.n_total, c.n_available, c.n_unavailable, availability).toLocaleString()}
            </option>
          ))}
        </select>
        <AvailabilityFilter value={availability} onChange={onAvailability} layout="block" />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">{copy("countries")}</dt>
            <dd className="text-xl font-extrabold">{totals.nCountries}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy("jobs_found")}</dt>
            <dd className="text-xl font-extrabold" data-testid="map-jobs-found">
              {shownJobs.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{copy("companies")}</dt>
            <dd className="text-xl font-extrabold">{totals.nCos.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy("listed_roles")}</dt>
            <dd className="text-xl font-extrabold">{totals.listed.toLocaleString()}</dd>
          </div>
        </dl>
        {current ? (
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="font-extrabold" data-testid="map-stats-country">
              {countryOf(selected)}
            </p>
            <p className="mt-1 text-muted">
              {mapMetricCopy(metric, locale)}: {metricValue(current, metric, availability).toLocaleString()}
              {unit ? ` ${unit}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Click a filled country on the map, or choose all countries.</p>
        )}
      </aside>
    </div>
  )
}
