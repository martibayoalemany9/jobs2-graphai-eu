"use client"

import { useEffect, useMemo, useState } from "react"
import { countryLabel } from "@/lib/country"

type Feat = {
  type: "Feature"
  properties: { ISO_A2?: string; NAME?: string }
  geometry: { type: string; coordinates: unknown }
}

function bucket(n: number, max: number): string {
  if (n <= 0) return "var(--map-empty)"
  const t = Math.log10(n + 1) / Math.log10(max + 1)
  if (t < 1 / 6) return "var(--map-1)"
  if (t < 2 / 6) return "var(--map-2)"
  if (t < 3 / 6) return "var(--map-3)"
  if (t < 4 / 6) return "var(--map-4)"
  if (t < 5 / 6) return "var(--map-5)"
  return "var(--map-6)"
}

function project(lon: number, lat: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w
  const y = ((90 - lat) / 180) * h
  return [x, y] as const
}

function ringToPath(ring: number[][], w: number, h: number) {
  return ring
    .map((pt, i) => {
      const [x, y] = project(pt[0], pt[1], w, h)
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ") + " Z"
}

function geomToPath(g: Feat["geometry"], w: number, h: number): string {
  if (g.type === "Polygon") {
    return (g.coordinates as number[][][]).map((r) => ringToPath(r, w, h)).join(" ")
  }
  if (g.type === "MultiPolygon") {
    return (g.coordinates as number[][][][])
      .map((poly) => poly.map((r) => ringToPath(r, w, h)).join(" "))
      .join(" ")
  }
  return ""
}

export function CountryMap({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>
  selected: string
  onSelect: (iso2: string) => void
}) {
  const [features, setFeatures] = useState<Feat[]>([])
  useEffect(() => {
    fetch("/geo/countries.geojson")
      .then((r) => r.json())
      .then((g: { features?: Feat[] }) => setFeatures(g.features || []))
      .catch(() => setFeatures([]))
  }, [])
  const max = useMemo(() => Math.max(1, ...Object.values(counts)), [counts])
  const w = 960
  const h = 420
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-map-ocean">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="World map of job counts" data-testid="country-map">
        {features.map((f, i) => {
          const iso = String(f.properties?.ISO_A2 || "").toUpperCase()
          if (!iso || iso === "-99") return null
          const n = counts[iso] || 0
          const selectedCls = iso === selected ? " is-selected" : ""
          return (
            <path
              key={`${iso}-${i}`}
              d={geomToPath(f.geometry, w, h)}
              className={`map-country${selectedCls}`}
              fill={bucket(n, max)}
              onClick={() => onSelect(iso)}
            >
              <title>{`${countryLabel(iso)} · ${n.toLocaleString()} jobs`}</title>
            </path>
          )
        })}
      </svg>
    </section>
  )
}
