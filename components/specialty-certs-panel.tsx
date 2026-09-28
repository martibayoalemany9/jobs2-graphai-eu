"use client"

import { useState } from "react"
import { SKILL_CATALOG } from "@/lib/skills-catalog"
import { CertJobBars, type CurvePoint } from "./vertical-job-slider"

export type Cert = {
  cert_id: string
  certification_name: string
  provider: string
  certification_url?: string
}

export function SpecialtyCertsPanel({
  cluster,
  onCluster,
  certs,
  selected,
  onToggle,
  k,
  n,
  points,
  onCommitK,
  emptyCopy,
}: {
  cluster: string
  onCluster: (id: string) => void
  certs: Cert[]
  selected: string[]
  onToggle: (id: string) => void
  k: number
  n: number
  points: CurvePoint[]
  onPreviewK?: (k: number) => void
  onCommitK: (k: number) => void
  emptyCopy?: string | null
}) {
  const [open, setOpen] = useState(true)
  const curve = points.length ? points : [{ k, n }]
  return (
    <section className="rounded-xl border border-border bg-surface p-4" data-testid="specialty-certs">
      <label className="text-sm font-bold">
        Specialty cluster
        <select
          className="mt-1 block w-full rounded-md border border-border bg-pill px-3 py-2"
          value={cluster}
          onChange={(e) => onCluster(e.target.value)}
          data-testid="specialty-combobox"
        >
          <option value="">All specialties</option>
          {SKILL_CATALOG.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-bold"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="certs-collapse"
        >
          <span>Certifications{selected.length ? ` · ${selected.length} selected` : ""}</span>
          <span className="text-muted">{open ? "Hide" : "Show"}</span>
        </button>
        {open ? (
          <fieldset className="mt-2">
            <legend className="sr-only">Certifications</legend>
            {certs.length === 0 ? (
              <p className="mt-2 text-sm text-muted" data-testid="empty-certs">
                No catalog certifications for this cluster.
              </p>
            ) : (
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {certs.map((c) => (
                  <li key={c.cert_id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(c.cert_id)}
                        onChange={() => onToggle(c.cert_id)}
                      />
                      <span>
                        {c.certification_name}
                        <span className="text-muted"> · {c.provider}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        ) : null}
      </div>
      <div className="mt-6">
        <CertJobBars points={curve} k={k} onSelect={onCommitK} />
        {emptyCopy ? <p className="mt-2 text-sm text-muted">{emptyCopy}</p> : null}
      </div>
    </section>
  )
}
