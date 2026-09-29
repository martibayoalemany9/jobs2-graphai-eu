"use client"

import { logBarWidth } from "@/lib/bar-scale"

export type CurvePoint = { k: number; n: number; cert_id?: string | null }

export function CertJobBars({
  points,
  k,
  onSelect,
}: {
  points: CurvePoint[]
  k: number
  onSelect: (k: number) => void
}) {
  const rows = points.length ? points : [{ k: 0, n: 0 }]
  const active = rows.find((p) => p.k === k) || rows[rows.length - 1]
  const max = Math.max(1, ...rows.map((p) => p.n), active?.n || 0)
  const width = logBarWidth(active?.n || 0, max)
  return (
    <div className="space-y-3" data-testid="cert-slider">
      <p className="text-sm text-muted">Jobs matching the selected certifications</p>
      <div className="grid grid-cols-[1fr_5rem] items-center gap-2" data-testid="cert-job-bar">
        <div className="h-5 overflow-hidden rounded-full bg-pill">
          <div className="h-full rounded-full bg-studio" style={{ width: `${width}%` }} />
        </div>
        <span className="text-right font-bold tabular-nums" data-testid="job-count-label">
          {(active?.n || 0).toLocaleString()}
        </span>
      </div>
      <div className="space-y-1.5" data-testid="cert-bars">
        {rows.map((p) => {
          const isActive = p.k === k
          const w = logBarWidth(p.n, max)
          return (
            <button
              key={p.k}
              type="button"
              onClick={() => onSelect(p.k)}
              className={`grid w-full grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm ${
                isActive ? "bg-mint" : "hover:bg-pill"
              }`}
              data-testid={isActive ? "cert-bar-active" : undefined}
              aria-pressed={isActive}
            >
              <span className="font-semibold tabular-nums">k={p.k}</span>
              <span className="block h-3 overflow-hidden rounded-sm bg-pill">
                <span className="block h-full rounded-sm bg-studio" style={{ width: `${w}%` }} />
              </span>
              <span className="text-right tabular-nums">{p.n.toLocaleString()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** @deprecated use CertJobBars */
export function VerticalJobSlider(props: {
  k: number
  maxK: number
  n: number
  onPreview: (k: number) => void
  onCommit: (k: number) => void
}) {
  const points: CurvePoint[] = []
  for (let i = 0; i <= props.maxK; i++) points.push({ k: i, n: i === props.k ? props.n : 0 })
  return <CertJobBars points={points} k={props.k} onSelect={props.onCommit} />
}
