"use client"

import { useEffect, useMemo, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { countryLabel } from "@/lib/country"

export type MapMetric = "jobs" | "companies" | "newMonth" | "remotePct" | "seniorPct"

export type CountryStats = {
  iso2: string
  n_total: number
  n_visible: number
  n_companies: number
  n_this_month: number
  remote_share: number
  senior_share: number
}

function metricValue(c: CountryStats | undefined, metric: MapMetric): number {
  if (!c) return 0
  if (metric === "jobs") return c.n_total
  if (metric === "companies") return c.n_companies
  if (metric === "newMonth") return c.n_this_month
  if (metric === "remotePct") return Math.round(c.remote_share * 1000) / 10
  return Math.round(c.senior_share * 1000) / 10
}

function bucketColor(n: number, max: number): string {
  if (n <= 0) return "var(--map-empty)"
  const t = Math.log10(n + 1) / Math.log10(max + 1)
  if (t < 1 / 6) return "var(--map-1)"
  if (t < 2 / 6) return "var(--map-2)"
  if (t < 3 / 6) return "var(--map-3)"
  if (t < 4 / 6) return "var(--map-4)"
  if (t < 5 / 6) return "var(--map-5)"
  return "var(--map-6)"
}

function isoOf(props: Record<string, unknown>): string {
  const a = String(props.ISO_A2 || "").toUpperCase()
  if (a && a !== "-99") return a
  const eh = String(props.ISO_A2_EH || props.POSTAL || "").toUpperCase()
  return eh === "-99" ? "" : eh
}

export function LeafletMap({
  stats,
  metric,
  selected,
  onSelect,
}: {
  stats: Record<string, CountryStats>
  metric: MapMetric
  selected: string
  onSelect: (iso2: string) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const max = useMemo(() => Math.max(1, ...Object.values(stats).map((s) => metricValue(s, metric))), [stats, metric])

  useEffect(() => {
    if (!el.current) return
    let map: import("leaflet").Map | null = null
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      const geo = await fetch("/geo/countries.geojson").then((r) => r.json())
      if (cancelled || !el.current) return
      map = L.map(el.current, { worldCopyJump: true, minZoom: 1, maxZoom: 6, zoomControl: true }).setView([30, 10], 2)
      const layer = L.geoJSON(geo, {
        style: (feat) => {
          const iso = isoOf((feat?.properties || {}) as Record<string, unknown>)
          const n = metricValue(stats[iso], metric)
          return {
            fillColor: bucketColor(n, max),
            fillOpacity: 0.92,
            color: iso === selected ? "var(--primary)" : "var(--map-stroke)",
            weight: iso === selected ? 2 : 0.6,
          }
        },
        onEachFeature: (feat, lyr) => {
          const iso = isoOf((feat.properties || {}) as Record<string, unknown>)
          if (!iso) return
          const n = metricValue(stats[iso], metric)
          const unit = metric.endsWith("Pct") ? "%" : ""
          lyr.bindTooltip(`${countryLabel(iso)} · ${n.toLocaleString()}${unit}`, { sticky: true, className: "job-tip" })
          lyr.on("click", () => onSelect(iso))
        },
      })
      layer.addTo(map)
    })()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [stats, metric, selected, onSelect, max])

  return <div ref={el} className="h-[420px] w-full rounded-xl" data-testid="country-map" />
}

export const MAP_METRICS: { id: MapMetric; label: string; unit: string; hint: string }[] = [
  { id: "jobs", label: "Jobs found", unit: "jobs", hint: "Harvested roles" },
  { id: "companies", label: "Companies", unit: "cos.", hint: "Distinct employers" },
  { id: "newMonth", label: "This month", unit: "jobs", hint: "Appeared this calendar month" },
  { id: "remotePct", label: "Remote share", unit: "%", hint: "Share of remote listings" },
  { id: "seniorPct", label: "Senior share", unit: "%", hint: "Senior / lead / manager titles" },
]
