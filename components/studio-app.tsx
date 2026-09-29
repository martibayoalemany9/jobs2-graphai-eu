"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { StudioHeader } from "./studio-header"
import { StudioTabs } from "./studio-tabs"
import { MapStudio } from "./map-studio"
import type { CountryStats } from "./leaflet-map"
import { CountryBar, type Kind } from "./country-bar"
import { TimeSeries, type KpiPoint, type SeriesPoint } from "./time-series"
import { SpecialtyCertsPanel, type Cert } from "./specialty-certs-panel"
import type { CurvePoint } from "./vertical-job-slider"
import { SpecialtyModal } from "./specialty-modal"
import { countryLabel } from "@/lib/country"
import { SKILL_CATALOG } from "@/lib/skills-catalog"
import type { Entitlement } from "@/lib/entitlement"
import { useSpecialtyLabel } from "./catalog-locale"

type Job = {
  job_key: string
  title: string
  company: string
  job_location: string
  headquarters_location?: string
  display_location?: string
  used_headquarters?: boolean
  availability: string
}

function useQueryView() {
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") return "map"
    return new URLSearchParams(window.location.search).get("view") || "map"
  })
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setView(q.get("view") || "map")
  }, [])
  const onView = (v: string) => {
    setView(v)
    const u = new URL(window.location.href)
    u.searchParams.set("view", v)
    window.history.replaceState(null, "", u.toString())
  }
  return { view, onView }
}

export function StudioApp() {
  const { view, onView } = useQueryView()
  const { isSignedIn } = useUser()
  const [countries, setCountries] = useState<CountryStats[]>([])
  const [iso2, setIso2] = useState("DE")
  const [kinds, setKinds] = useState<Kind[]>([])
  const [nTotal, setNTotal] = useState(0)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [kpi, setKpi] = useState<KpiPoint[]>([])
  const [availability, setAvailability] = useState("all")
  const [cluster, setCluster] = useState("")
  const [certs, setCerts] = useState<Cert[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [k, setK] = useState(0)
  const [nJobs, setNJobs] = useState(0)
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([])
  const [emptyCopy, setEmptyCopy] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [ent, setEnt] = useState<Entitlement | null>(null)
  const [freeMode, setFreeMode] = useState(false)
  const [profileSpecs, setProfileSpecs] = useState<string[]>([])
  const [showSpecModal, setShowSpecModal] = useState(false)
  const [msg, setMsg] = useState("")
  const labelOf = useSpecialtyLabel()

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => {
        setCountries(d.countries || [])
        setEnt(d.entitlement)
        if (d.countries?.[0]?.iso2) setIso2(d.countries[0].iso2)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.specialties) setProfileSpecs(d.specialties)
        if (typeof d.free_mode === "boolean") setFreeMode(d.free_mode)
        if (d.entitlement) setEnt(d.entitlement)
        if (d.specialties_prompted === false) setShowSpecModal(true)
      })
      .catch(() => {})
  }, [isSignedIn])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const pay = q.get("pay")
    if (pay !== "revolut" && pay !== "stripe") return
    const u = new URLSearchParams()
    if (q.get("order_id")) u.set("order_id", q.get("order_id") || "")
    if (q.get("session_id")) u.set("session_id", q.get("session_id") || "")
    fetch(`/api/billing/confirm?${u}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.entitlement) setEnt(d.entitlement)
        setMsg(d.paid ? "Subscription is active." : d.error || "Payment is still pending.")
        const next = new URL(window.location.href)
        next.searchParams.delete("pay")
        next.searchParams.delete("order_id")
        next.searchParams.delete("session_id")
        next.searchParams.set("view", "settings")
        window.history.replaceState(null, "", next.toString())
        setViewSafe("settings")
      })
      .catch(() => setMsg("Could not confirm payment."))
  }, [])

  function setViewSafe(v: string) {
    onView(v)
  }

  useEffect(() => {
    if (!iso2) return
    fetch(`/api/countries/${iso2}`)
      .then((r) => r.json())
      .then((d) => {
        setNTotal(d.n_total || 0)
        setKinds(d.kinds || [])
      })
      .catch(() => {})
    fetch(`/api/countries/${iso2}/series`)
      .then((r) => r.json())
      .then((d) => {
        setSeries(d.series || [])
        setKpi(d.kpi || [])
      })
      .catch(() => {})
  }, [iso2])

  const loadCerts = useCallback(() => {
    const q = cluster ? `?cluster=${encodeURIComponent(cluster)}` : ""
    fetch(`/api/certs${q}`)
      .then((r) => r.json())
      .then((d) => setCerts(d.certs || []))
      .catch(() => setCerts([]))
  }, [cluster])

  useEffect(() => {
    loadCerts()
  }, [loadCerts])

  const loadCurveAndJobs = useCallback(() => {
    const sp = cluster ? cluster : ""
    const certsQ = selected.join(",")
    const u = new URLSearchParams({ country: iso2 })
    if (sp) u.set("specialties", sp)
    if (certsQ) u.set("certs", certsQ)
    fetch(`/api/jobs/cert-curve?${u}`)
      .then((r) => r.json())
      .then((d) => {
        const pts = (d.points || []) as CurvePoint[]
        setCurvePoints(pts)
        const atK = pts.find((p) => p.k === k) || pts[pts.length - 1]
        setNJobs(atK?.n || 0)
        setEmptyCopy(d.empty_copy || null)
        setEnt(d.entitlement)
      })
      .catch(() => {})
    const ju = new URLSearchParams({ country: iso2, availability, limit: "20" })
    if (sp) ju.set("specialties", sp)
    if (certsQ) ju.set("certs", certsQ)
    fetch(`/api/jobs?${ju}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
  }, [iso2, cluster, selected, k, availability])

  useEffect(() => {
    if (view === "jobs" || view === "list") loadCurveAndJobs()
  }, [view, loadCurveAndJobs])

  function toggleCert(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setK(next.length)
      return next
    })
  }

  function commitK(nextK: number) {
    const prefix = selected.slice(0, nextK)
    setSelected(prefix)
    setK(nextK)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ specialties: profileSpecs, free_mode: freeMode }),
    })
    const d = await res.json()
    setMsg(res.ok ? "Saved" : d.error || "Could not save")
    if (d.entitlement) setEnt(d.entitlement)
  }

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <StudioHeader entitlement={ent} onMessage={setMsg} />
      <StudioTabs view={view} onView={onView} />
      {showSpecModal ? (
        <SpecialtyModal
          initial={profileSpecs}
          onClose={() => setShowSpecModal(false)}
          onSaved={(sp) => setProfileSpecs(sp)}
        />
      ) : null}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-10">
        {view === "map" && (
          <>
            <MapStudio countries={countries} selected={iso2} onSelect={setIso2} />
            <CountryBar iso2={iso2} nTotal={nTotal} kinds={kinds} />
            <TimeSeries series={series} kpi={kpi} />
          </>
        )}
        {view === "list" && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-extrabold">Countries</h2>
            <table className="mt-3 w-full text-sm" data-testid="country-table">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1">Country</th>
                  <th>Jobs</th>
                  <th>Visible</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.iso2} className="border-t border-border">
                    <td className="py-1">
                      <button type="button" className="font-semibold" onClick={() => { setIso2(c.iso2); onView("map") }}>
                        {countryLabel(c.iso2)}
                      </button>
                    </td>
                    <td>{c.n_total.toLocaleString()}</td>
                    <td>{c.n_visible.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6">
              <CountryBar iso2={iso2} nTotal={nTotal} kinds={kinds} />
            </div>
          </section>
        )}
        {view === "jobs" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-bold">
                Country
                <select
                  className="ml-2 rounded-md border border-border bg-surface px-2 py-1"
                  value={iso2}
                  onChange={(e) => setIso2(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c.iso2} value={c.iso2}>
                      {countryLabel(c.iso2)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Availability
                <select
                  className="ml-2 rounded-md border border-border bg-surface px-2 py-1"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  data-testid="availability-filter"
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="probably_unavailable">Unavailable</option>
                </select>
              </label>
            </div>
            <SpecialtyCertsPanel
              cluster={cluster}
              onCluster={setCluster}
              certs={certs}
              selected={selected}
              onToggle={toggleCert}
              k={k}
              n={nJobs}
              points={curvePoints}
              onCommitK={commitK}
              emptyCopy={emptyCopy}
            />
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface" data-testid="job-list">
              {jobs.map((j) => (
                <li key={j.job_key} className="p-4">
                  <Link href={`/jobs/${j.job_key}`} className="font-bold hover:underline">
                    {j.title}
                  </Link>
                  <div className="text-sm text-muted" data-testid="job-location-line">
                    {j.company} · {j.display_location || j.job_location}
                    {j.headquarters_location &&
                    !j.used_headquarters &&
                    j.headquarters_location !== (j.display_location || j.job_location) &&
                    !(j.display_location || "").includes("HQ ") ? (
                      <span data-testid="job-hq"> · HQ {j.headquarters_location}</span>
                    ) : null}{" "}
                    · {j.availability}
                  </div>
                </li>
              ))}
              {jobs.length === 0 && <li className="p-4 text-sm text-muted">No listings in this cap.</li>}
            </ul>
          </>
        )}
        {view === "settings" && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-extrabold">Settings</h2>
            <p className="mt-2 text-sm text-muted" data-testid="entitlement">
              Plan: {ent?.tier || "anonymous"} · cap {ent?.cap_per_country ?? "unlimited"} listings
              {ent?.trial_ends_at ? ` · 7-day trial ends ${ent.trial_ends_at.slice(0, 10)}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              New accounts see 10,000 listings for seven days. After that, subscribe for €5 / month (Stripe or Revolut) or the cap falls to 50 jobs.
            </p>
            <form className="mt-4 space-y-3" onSubmit={saveProfile}>
              <fieldset>
                <legend className="text-sm font-bold">Specialties</legend>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {SKILL_CATALOG.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={profileSpecs.includes(s.id)}
                        onChange={() =>
                          setProfileSpecs((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))
                        }
                      />
                      {labelOf(s.id)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={freeMode} onChange={(e) => setFreeMode(e.target.checked)} data-testid="free-mode" />
                Free mode (10,000 listings during trial or while subscribed)
              </label>
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
                Save profile
              </button>
            </form>
            {msg ? <p className="mt-2 text-sm">{msg}</p> : null}
          </section>
        )}
      </main>
      <footer className="mt-auto border-t border-border px-4 py-4 text-sm text-muted md:px-10">
        <a href="https://graphai.eu/imprint" className="hover:underline">Imprint</a>
        {" · "}
        <a href="https://graphai.eu" className="hover:underline">Privacy</a>
        {" · "}
        Graphai OÜ
      </footer>
    </div>
  )
}
