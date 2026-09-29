"use client"

import { availabilityCount, type Availability } from "@/lib/availability"
import { logBarWidth } from "@/lib/bar-scale"
import { useAvailabilityLabel, useCountryLabel, useSpecialtyLabel } from "./catalog-locale"

export type Kind = { specialty: string; n: number; n_available?: number; n_unavailable?: number }

export function CountryBar({
  iso2,
  nTotal,
  nAvailable = 0,
  nUnavailable = 0,
  kinds,
  availability = "all",
}: {
  iso2: string
  nTotal: number
  nAvailable?: number
  nUnavailable?: number
  kinds: Kind[]
  availability?: Availability
}) {
  const labelOf = useSpecialtyLabel()
  const countryOf = useCountryLabel()
  const availOf = useAvailabilityLabel()
  const shown = availabilityCount(nTotal, nAvailable, nUnavailable, availability)
  const suffix =
    availability === "all" ? "jobs" : `${availOf(availability).toLowerCase()} jobs`
  const rows = kinds.filter((k) => k.specialty !== "*")
  const named = rows.filter((k) => k.specialty !== "uncategorized" && k.specialty !== "weitere")
  const other = rows.find((k) => k.specialty === "weitere" || k.specialty === "uncategorized")
  const countOf = (k: Kind) =>
    availabilityCount(k.n, k.n_available ?? k.n, k.n_unavailable ?? 0, availability)
  const max = Math.max(1, ...named.map(countOf))
  return (
    <section aria-label="Job counts by occupation" className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-extrabold tracking-tight" data-testid="country-bar-heading">
        {countryOf(iso2)} · {shown.toLocaleString()} {suffix}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Counts by occupation. Bar length is log-scaled so smaller fields stay visible.
      </p>
      <div className="mt-4 space-y-2" data-testid="country-bar">
        {named.map((k) => (
          <Bar key={k.specialty} specialty={k.specialty} label={labelOf(k.specialty)} n={countOf(k)} max={max} />
        ))}
        {other ? (
          <Bar
            key="weitere"
            specialty={other.specialty}
            label={labelOf(other.specialty)}
            n={countOf(other)}
            max={Math.max(max, countOf(other))}
            muted
          />
        ) : null}
      </div>
    </section>
  )
}

function Bar({
  specialty,
  label,
  n,
  max,
  muted,
}: {
  specialty: string
  label: string
  n: number
  max: number
  muted?: boolean
}) {
  const w = logBarWidth(n, max)
  return (
    <div className="flex items-center gap-3 text-sm" data-specialty={specialty}>
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
