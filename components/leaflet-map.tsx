"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { countryLabel } from "@/lib/country"
import { MapProgress } from "./map-progress"

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

async function readGeojson(res: Response, onRatio: (ratio: number) => void): Promise<unknown> {
  const total = Number(res.headers.get("content-length")) || 838726
  if (!res.body) return res.json()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    received += value.length
    onRatio(Math.min(1, received / total))
  }
  const buf = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    buf.set(chunk, offset)
    offset += chunk.length
  }
  return JSON.parse(new TextDecoder().decode(buf))
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
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const layerRef = useRef<import("leaflet").GeoJSON | null>(null)
  const statsRef = useRef(stats)
  const metricRef = useRef(metric)
  const selectedRef = useRef(selected)
  const onSelectRef = useRef(onSelect)
  const max = useMemo(() => Math.max(1, ...Object.values(stats).map((s) => metricValue(s, metric))), [stats, metric])
  const maxRef = useRef(max)
  statsRef.current = stats
  metricRef.current = metric
  selectedRef.current = selected
  onSelectRef.current = onSelect
  maxRef.current = max

  const [progress, setProgress] = useState(8)
  const [label, setLabel] = useState("Loading world map")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function styleFeature(feat?: { properties?: Record<string, unknown> }) {
    const iso = isoOf((feat?.properties || {}) as Record<string, unknown>)
    const n = metricValue(statsRef.current[iso], metricRef.current)
    return {
      fillColor: bucketColor(n, maxRef.current),
      fillOpacity: 0.92,
      color: iso === selectedRef.current ? "var(--primary)" : "var(--map-stroke)",
      weight: iso === selectedRef.current ? 2 : 0.6,
    }
  }

  function paintLayer() {
    const layer = layerRef.current
    if (!layer) return
    layer.setStyle((feat) => styleFeature(feat as { properties?: Record<string, unknown> } | undefined))
    const unit = metricRef.current.endsWith("Pct") ? "%" : ""
    layer.eachLayer((lyr) => {
      const feat = (lyr as import("leaflet").Layer & { feature?: { properties?: Record<string, unknown> } }).feature
      const iso = isoOf((feat?.properties || {}) as Record<string, unknown>)
      if (!iso) return
      const n = metricValue(statsRef.current[iso], metricRef.current)
      const path = lyr as import("leaflet").Path
      if (path.getTooltip()) {
        path.setTooltipContent(`${countryLabel(iso)} · ${n.toLocaleString()}${unit}`)
      }
    })
  }

  useEffect(() => {
    if (!el.current) return
    let cancelled = false
    ;(async () => {
      try {
        setLabel("Loading map library")
        setProgress(14)
        const L = (await import("leaflet")).default
        if (cancelled || !el.current) return
        setLabel("Downloading countries")
        setProgress(22)
        const res = await fetch("/geo/countries.geojson")
        if (!res.ok) throw new Error(`map ${res.status}`)
        const geo = await readGeojson(res, (ratio) => {
          if (!cancelled) setProgress(22 + ratio * 58)
        })
        if (cancelled || !el.current) return
        setLabel("Drawing map")
        setProgress(86)
        const map = L.map(el.current, { worldCopyJump: true, minZoom: 1, maxZoom: 6, zoomControl: true }).setView([30, 10], 2)
        const layer = L.geoJSON(geo as Parameters<typeof L.geoJSON>[0], {
          style: (feat) => styleFeature(feat as { properties?: Record<string, unknown> } | undefined),
          onEachFeature: (feat, lyr) => {
            const iso = isoOf((feat.properties || {}) as Record<string, unknown>)
            if (!iso) return
            const n = metricValue(statsRef.current[iso], metricRef.current)
            const unit = metricRef.current.endsWith("Pct") ? "%" : ""
            lyr.bindTooltip(`${countryLabel(iso)} · ${n.toLocaleString()}${unit}`, { sticky: true, className: "job-tip" })
            lyr.on("click", () => onSelectRef.current(iso))
          },
        })
        layer.addTo(map)
        mapRef.current = map
        layerRef.current = layer
        map.invalidateSize()
        setProgress(100)
        setLabel("World map ready")
        window.setTimeout(() => {
          if (!cancelled) setReady(true)
        }, 160)
      } catch {
        if (!cancelled) setError("Could not load the world map")
      }
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    paintLayer()
  }, [stats, metric, selected, max])

  return (
    <div className="relative h-[420px] w-full" data-testid="country-map" aria-busy={!ready}>
      <div ref={el} className="h-[420px] w-full rounded-xl" />
      {!ready && !error ? <MapProgress value={progress} label={label} /> : null}
      {error ? (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-map-ocean px-8 text-sm font-semibold text-muted">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export const MAP_METRICS: { id: MapMetric; label: string; unit: string; hint: string }[] = [
  { id: "jobs", label: "Jobs found", unit: "jobs", hint: "Harvested roles" },
  { id: "companies", label: "Companies", unit: "cos.", hint: "Distinct employers" },
  { id: "newMonth", label: "This month", unit: "jobs", hint: "Appeared this calendar month" },
  { id: "remotePct", label: "Remote share", unit: "%", hint: "Share of remote listings" },
  { id: "seniorPct", label: "Senior share", unit: "%", hint: "Senior / lead / manager titles" },
]
