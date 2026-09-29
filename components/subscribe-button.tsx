"use client"

import { useState } from "react"
import { Show, SignInButton } from "@clerk/nextjs"
import { clerkSatelliteForHost } from "@/lib/clerk-runtime"
import type { Entitlement } from "@/lib/entitlement"

export function SubscribeButton({
  entitlement,
  onMessage,
}: {
  entitlement?: Entitlement | null
  onMessage?: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const host = typeof window === "undefined" ? "" : window.location.host
  const mode = clerkSatelliteForHost(host) ? "redirect" : "modal"
  const paid = entitlement?.tier === "paid" || entitlement?.tier === "operator"

  async function start(provider: "stripe" | "revolut") {
    setBusy(true)
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (d.url) {
      window.location.href = d.url
      return
    }
    onMessage?.(d.operator ? "Operator access is already unlimited." : d.error || "Checkout unavailable")
    setOpen(false)
  }

  if (paid) {
    return (
      <span className="rounded-md bg-mint px-3 py-1.5 text-sm font-semibold" data-testid="subscribe-status">
        Subscribed
      </span>
    )
  }

  return (
    <div className="relative">
      <Show when="signed-out">
        <SignInButton mode={mode}>
          <button type="button" className="rounded-md bg-studio px-3 py-1.5 text-sm font-bold text-primary-foreground" data-testid="subscribe">
            Subscribe · €5 / month
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <button
          type="button"
          className="rounded-md bg-studio px-3 py-1.5 text-sm font-bold text-primary-foreground"
          onClick={() => setOpen((v) => !v)}
          data-testid="subscribe"
        >
          Subscribe · €5 / month
        </button>
        {open ? (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-surface p-2 shadow-lg">
            <p className="px-2 pb-2 text-xs text-muted">€5 / month after a 7-day trial. Then 50 listings unless you subscribe.</p>
            <button
              type="button"
              disabled={busy}
              className="block w-full rounded-md px-2 py-2 text-left text-sm font-semibold hover:bg-mint"
              onClick={() => start("stripe")}
            >
              Pay with Stripe
            </button>
            <button
              type="button"
              disabled={busy}
              className="block w-full rounded-md px-2 py-2 text-left text-sm font-semibold hover:bg-mint"
              onClick={() => start("revolut")}
            >
              Pay with Revolut
            </button>
          </div>
        ) : null}
      </Show>
    </div>
  )
}
