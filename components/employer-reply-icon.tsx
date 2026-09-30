"use client"

import { useState } from "react"
import { useUiCopy } from "./catalog-locale"
import type { JobComm } from "@/lib/job-comms"

export function EmployerReplyIcon({
  company,
  comm,
}: {
  company: string
  comm?: JobComm | null
}) {
  const copy = useUiCopy()
  const [open, setOpen] = useState(false)
  if (!comm?.reply_product) return null
  return (
    <>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ok text-[11px] font-extrabold text-primary-foreground"
        title={copy("employer_replied")}
        aria-label={copy("employer_replied")}
        data-testid="employer-reply-icon"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        ✓
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="employer-reply-modal"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-md rounded-xl border border-border bg-surface p-5 text-sm shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p>
              {copy("employer_replied_body")
                .replace("{company}", company || "The company")
                .replace("{product}", comm.reply_product)}
            </p>
            {comm.info_note ? (
              <p className="mt-3 rounded-lg bg-warn-bg p-3 text-warn" data-testid="employer-reply-info">
                {comm.info_note}
              </p>
            ) : null}
            <button
              type="button"
              className="mt-4 font-semibold text-studio hover:underline"
              data-testid="employer-reply-close"
              onClick={() => setOpen(false)}
            >
              {copy("close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
