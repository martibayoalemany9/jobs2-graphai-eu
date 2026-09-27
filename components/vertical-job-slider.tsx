"use client"

export function VerticalJobSlider({
  k,
  maxK,
  n,
  onPreview,
  onCommit,
}: {
  k: number
  maxK: number
  n: number
  onPreview: (k: number) => void
  onCommit: (k: number) => void
}) {
  return (
    <div className="flex items-start gap-4">
      <input
        type="range"
        className="vslider"
        min={0}
        max={Math.max(0, maxK)}
        step={1}
        value={k}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, maxK)}
        aria-valuenow={k}
        aria-valuetext={`${n} jobs`}
        aria-label="Certification prefix length"
        data-testid="cert-slider"
        onChange={(e) => onPreview(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      />
      <div>
        <div className="text-3xl font-extrabold tabular-nums" data-testid="job-count-label">
          {n.toLocaleString()}
        </div>
        <div className="text-sm text-muted">jobs at k = {k} certifications</div>
      </div>
    </div>
  )
}
