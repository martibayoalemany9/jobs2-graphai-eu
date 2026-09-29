"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StudioHeader } from "@/components/studio-header"
import { SKILL_CATALOG } from "@/lib/skills-catalog"

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function save(next: string[]) {
    setBusy(true)
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ specialties: next, free_mode: false }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok) {
      setErr(d.error || "Could not save")
      return
    }
    router.push("/?view=jobs")
  }

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <StudioHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight">Choose your specialties</h1>
        <p className="mt-2 text-sm text-muted">Optional. You can also set specialties later in Settings. Job listings stay open without this step.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save(selected)
          }}
          data-testid="onboarding"
        >
          <div className="grid gap-2">
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
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            data-testid="specialty-continue"
          >
            Continue
          </button>
          <button
            type="button"
            disabled={busy}
            className="ml-2 rounded-md border border-border px-3 py-2 text-sm font-semibold"
            onClick={() => save([])}
          >
            Skip
          </button>
        </form>
      </main>
    </div>
  )
}
