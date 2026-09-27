"use client"

import { countryLabel } from "@/lib/country"

export type Kind = { specialty: string; n: number }

export function CountryBar({
  iso2,
  nTotal,
  kinds,
}: {
  iso2: string
  nTotal: number
  kinds: Kind[]
}) {
  const max = Math.max(nTotal, ...kinds.map((k) => k.n), 1)
  return (
    <section aria-label="Country job counts" className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-extrabold tracking-tight">
        {countryLabel(iso2)} · {nTotal.toLocaleString()} jobs
      </h2>
      <p className="mt-1 text-sm text-muted">True harvest count for this country (listings stay capped by your plan).</p>
      <div className="mt-4 space-y-2" data-testid="country-bar">
        <Bar label="All jobs" n={nTotal} max={max} accent />
        {kinds.slice(0, 12).map((k) => (
          <Bar key={k.specialty} label={k.specialty} n={k.n} max={max} />
        ))}
      </div>
    </section>
  )
}

function Bar({ label, n, max, accent }: { label: string; n: number; max: number; accent?: boolean }) {
  const w = Math.max(2, Math.round((n / max) * 100))
  return (
    <div className="grid grid-cols-[8rem_1fr_4.5rem] items-center gap-2 text-sm">
      <span className="truncate font-semibold">{label}</span>
      <div className="h-3 rounded-full bg-pill">
        <div
          className={`h-3 rounded-full ${accent ? "bg-studio" : "bg-primary"}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <span className="text-right tabular-nums text-muted">{n.toLocaleString()}</span>
    </div>
  )
}
