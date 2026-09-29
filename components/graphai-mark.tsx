export function GraphaiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} role="img" aria-hidden="true">
      <path
        d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9L16 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M10.5 21 16 12l6 6M16 12v-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8" r="2" fill="currentColor" />
      <circle cx="10.5" cy="21.5" r="2" fill="currentColor" />
      <circle cx="22" cy="18.5" r="2" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}
