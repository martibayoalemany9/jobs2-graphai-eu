export function MapProgress({
  value,
  label = "Loading world map",
}: {
  value: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className="absolute inset-0 z-[1100] flex flex-col items-center justify-center gap-3 bg-map-ocean px-8"
      data-testid="map-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-pill">
        <div
          className="h-2.5 rounded-full bg-studio transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs tabular-nums text-muted">{pct}%</p>
    </div>
  )
}
