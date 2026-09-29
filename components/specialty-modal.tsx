"use client"

import { useState } from "react"
import { SKILL_CATALOG } from "@/lib/skills-catalog"

export function SpecialtyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: string[]
  onClose: () => void
  onSaved: (specialties: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function save(next: string[]) {
    setBusy(true)
    setErr("")
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ specialties: next }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setErr(d.error || "Could not save")
      return
    }
    onSaved(next)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="specialty-modal">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-surface p-5 shadow-lg">
        <h2 className="text-lg font-extrabold">Choose your specialties</h2>
        <p className="mt-1 text-sm text-muted">
          Optional. You can change this later in Settings. Job listings stay open without this step.
        </p>
        <div className="mt-4 grid max-h-[50vh] gap-1 overflow-auto sm:grid-cols-2">
          {SKILL_CATALOG.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={() =>
                  setSelected((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))
                }
              />
              {s.label}
            </label>
          ))}
        </div>
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            onClick={() => save(selected)}
            data-testid="specialty-continue"
          >
            Continue
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
            onClick={() => save([])}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
