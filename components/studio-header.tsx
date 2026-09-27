"use client"

import Link from "next/link"
import { Show, SignInButton, UserButton } from "@clerk/nextjs"

export function StudioHeader() {
  return (
    <header className="flex flex-wrap items-center gap-x-7 gap-y-2 bg-surface px-4 py-3 md:px-10">
      <Link href="/" aria-label="graphai jobs" className="flex items-center gap-2.5 no-underline">
        <span className="text-[28px] font-extrabold lowercase leading-none tracking-[-0.04em]">
          graphai jobs
        </span>
      </Link>
      <nav className="flex items-center gap-6 text-[15px] font-semibold" aria-label="Primary">
        <a href="https://graphai.eu" className="no-underline hover:underline">graphai.eu</a>
        <a href="https://jobs.graphai.eu/companies/" className="no-underline hover:underline">companies</a>
        <Link
          href="/?view=map"
          className="inline-flex items-center rounded-[10px] px-3.5 py-1.5 font-bold no-underline bg-studio text-primary-foreground"
        >
          jobs studio
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm font-semibold">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button type="button" className="rounded-md border border-border px-3 py-1.5 hover:bg-mint">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  )
}
