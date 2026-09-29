"use client"

import { countryLabel } from "@/lib/country"
import { specialtyLabel } from "@/lib/skills-catalog"
import { logBarWidth } from "@/lib/bar-scale"

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
  const rows = kinds.filter((k) => k.specialty !== "*")
  const named = rows.filter((k) => k.specialty !== "uncategorized" && k.specialty !== "weitere").slice(0, 24)
  const other = rows.find((k) => k.specialty === "weitere" || k.specialty === "uncategorized")
  const max = Math.max(1, ...named.map((k) => k.n))
  return (
    <section aria-label="Country job counts" className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-extrabold tracking-tight">
        {countryLabel(iso2)} · {nTotal.toLocaleString()} jobs
      </h2>
      <p className="mt-1 text-sm text-muted">
        Counts by occupation. Bar length is log-scaled so smaller fields stay visible.
      </p>
      <div className="mt-4 space-y-2" data-testid="country-bar">
        {named.map((k) => (
          <Bar key={k.specialty} label={specialtyLabel(k.specialty)} n={k.n} max={max} />
        ))}
        {other ? (
          <Bar key="weitere" label={specialtyLabel(other.specialty)} n={other.n} max={Math.max(max, other.n)} muted />
        ) : null}
      </div>
    </section>
  )
}

function Bar({
  label,
  n,
  max,
  muted,
}: {
  label: string
  n: number
  max: number
  muted?: boolean
}) {
  const w = logBarWidth(n, max)
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-52 shrink-0 font-semibold leading-snug">{label}</span>
      <div className="h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-pill">
        <div
          className={`h-2.5 rounded-full ${muted ? "bg-muted" : "bg-primary"}`}
          style={{ width: `${Math.min(100, w)}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right tabular-nums text-muted">{n.toLocaleString()}</span>
    </div>
  )
}
