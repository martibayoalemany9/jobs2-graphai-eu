/** Log10 bar width in percent so small job counts stay visible. */
export function logBarWidth(n: number, max: number): number {
  if (!(n > 0) || !(max > 0)) return 0
  const t = Math.log10(n + 1) / Math.log10(max + 1)
  return Math.max(4, Math.min(100, Math.round(t * 100)))
}
