"use client"

import { useState } from "react"
import { useCatalogLocale, useUiCopy } from "./catalog-locale"

const REPORT_MAIL = "hello@graphai.eu"

function mailtoHref(opts: {
  kind: "deletion" | "correction"
  jobKey: string
  title?: string
  company?: string
  message: string
  contact: string
  locale: string
}) {
  const subject =
    opts.kind === "deletion"
      ? `Job offer deletion request ${opts.jobKey}`
      : `Job offer correction request ${opts.jobKey}`
  const body = [
    `Kind: ${opts.kind}`,
    `Job key: ${opts.jobKey}`,
    opts.title ? `Title: ${opts.title}` : "",
    opts.company ? `Company: ${opts.company}` : "",
    `Locale: ${opts.locale}`,
    opts.contact ? `Contact: ${opts.contact}` : "",
    "",
    opts.message || "(no details)",
  ]
    .filter((line) => line !== "")
    .join("\n")
  return `mailto:${REPORT_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function JobReport({
  jobKey,
  title,
  company,
  compact = false,
}: {
  jobKey: string
  title?: string
  company?: string
  compact?: boolean
}) {
  const copy = useUiCopy()
  const { locale } = useCatalogLocale()
  const [kind, setKind] = useState<"deletion" | "correction">("correction")
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState("")
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const href = mailtoHref({ kind, jobKey, title, company, message, contact, locale })
    try {
      await fetch(`/api/jobs/${encodeURIComponent(jobKey)}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, message, contact, locale, title, company }),
      })
    } catch {
      /* mailbox still opens */
    }
    window.location.href = href
    setStatus("sent")
  }

  if (compact) {
    return (
      <a
        className="text-xs font-semibold text-muted hover:underline"
        data-testid="job-report-link"
        href={mailtoHref({ kind: "correction", jobKey, title, company, message: "", contact: "", locale })}
        onClick={() => {
          fetch(`/api/jobs/${encodeURIComponent(jobKey)}/report`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "correction", message: "", contact: "", locale, title, company }),
          }).catch(() => {})
        }}
      >
        {copy("report_compact")}
      </a>
    )
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-4" data-testid="job-report">
      <h2 className="font-extrabold">{copy("report_title")}</h2>
      <p className="mt-1 text-sm text-muted">
        {copy("report_blurb")}{" "}
        <a className="font-semibold hover:underline" href={`mailto:${REPORT_MAIL}`}>
          {REPORT_MAIL}
        </a>
      </p>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">{copy("report_title")}</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="report-kind"
              checked={kind === "correction"}
              onChange={() => setKind("correction")}
            />
            {copy("report_correction")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="report-kind"
              checked={kind === "deletion"}
              onChange={() => setKind("deletion")}
            />
            {copy("report_deletion")}
          </label>
        </fieldset>
        <label className="block text-sm">
          <span className="font-semibold">{copy("report_message")}</span>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-pill px-2 py-2"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="job-report-message"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">{copy("report_contact")}</span>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-border bg-pill px-2 py-2"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          data-testid="job-report-send"
        >
          {copy("report_send")}
        </button>
        {status === "sent" ? <p className="text-sm text-muted">{copy("report_sent")}</p> : null}
      </form>
    </section>
  )
}
