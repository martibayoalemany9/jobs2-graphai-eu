"use client"

import { AVAILABILITY_VALUES, parseAvailability, type Availability } from "@/lib/availability"
import { useAvailabilityLabel } from "./catalog-locale"

export function AvailabilityFilter({
  value,
  onChange,
  layout = "inline",
}: {
  value: Availability
  onChange: (next: Availability) => void
  layout?: "inline" | "block"
}) {
  const labelOf = useAvailabilityLabel()
  const selectClass =
    layout === "block"
      ? "mt-1 w-full rounded-md border border-border bg-pill px-2 py-2 text-sm"
      : "rounded-md border border-border bg-surface px-2 py-1"
  return (
    <label className={layout === "block" ? "mt-3 block text-sm" : "text-sm"}>
      <span className="sr-only">Applications</span>
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(parseAvailability(e.target.value))}
        data-testid="availability-filter"
        aria-label="Applications"
      >
        {AVAILABILITY_VALUES.map((id) => (
          <option key={id} value={id} data-testid={`availability-${id}`}>
            {labelOf(id)}
          </option>
        ))}
      </select>
    </label>
  )
}
