"use client"

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
  const max = Math.max(1, ...rows.map((p) => p.n))
  return (
    <div className="space-y-2" data-testid="cert-slider">
      <p className="text-sm text-muted">Jobs matching the first k selected certifications</p>
      <div className="space-y-1.5" data-testid="cert-bars">
        {rows.map((p) => {
          const active = p.k === k
          const width = Math.max(2, (p.n / max) * 100)
          return (
            <button
              key={p.k}
              type="button"
              onClick={() => onSelect(p.k)}
              className={`grid w-full grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm ${
                active ? "bg-mint" : "hover:bg-pill"
              }`}
              data-testid={active ? "cert-bar-active" : undefined}
              aria-pressed={active}
            >
              <span className="font-semibold tabular-nums">k={p.k}</span>
              <span className="block h-4 overflow-hidden rounded-sm bg-pill">
                <span
                  className="block h-full rounded-sm bg-studio"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="text-right font-bold tabular-nums" data-testid={active ? "job-count-label" : undefined}>
                {p.n.toLocaleString()}
              </span>
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
