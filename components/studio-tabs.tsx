"use client"

import { useUiCopy } from "./catalog-locale"
import type { UiKey } from "@/lib/ui-copy"

const TABS: { id: string; key: UiKey }[] = [
  { id: "map", key: "tab_map" },
  { id: "list", key: "tab_list" },
  { id: "jobs", key: "tab_jobs" },
  { id: "settings", key: "tab_settings" },
]

export function StudioTabs({ view, onView }: { view: string; onView: (v: string) => void }) {
  const copy = useUiCopy()
  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface px-4 py-2 md:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Studio views">
        {TABS.map((t) => {
          const selected = view === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              title={copy(t.key)}
              onClick={() => onView(t.id)}
              className={`view-tab inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                selected ? "bg-mint text-foreground" : "text-muted hover:bg-mint"
              }`}
            >
              <span className="view-label">{copy(t.key)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
