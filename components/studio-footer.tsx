import Link from "next/link"

export function StudioFooter() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-4 text-sm text-muted md:px-10">
      <Link href="/imprint" className="hover:underline">
        Imprint
      </Link>
      {" · "}
      <Link href="/imprint#privacy" className="hover:underline">
        Privacy
      </Link>
      {" · "}
      Graphai OÜ
    </footer>
  )
}
