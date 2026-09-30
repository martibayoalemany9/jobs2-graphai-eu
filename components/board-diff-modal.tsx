"use client"

import { useEffect, useMemo, useState } from "react"
import { useCatalogLocale, useUiCopy } from "./catalog-locale"
import { boardLabel } from "@/lib/job-boards"
import { wordDiff, type DiffOp } from "@/lib/text-diff"

type ComparePayload = {
  master?: { job_key: string; board_id: string; title: string; company: string; url: string; text: string }
  selected?: {
    job_key: string
    board_id: string
    is_master: boolean
    title: string
    company: string
    url: string
    text: string
  }
  full_description?: boolean
}

function DiffText({ ops }: { ops: DiffOp[] }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-6" data-testid="board-diff-text">
      {ops.map((op, i) => {
        if (op.type === "add") {
          return (
            <span key={i} className="bg-ok-bg text-ok" data-testid="board-diff-add">
              {op.text}
            </span>
          )
        }
        if (op.type === "del") {
          return (
            <span key={i} className="bg-danger-bg text-danger line-through" data-testid="board-diff-del">
              {op.text}
            </span>
          )
        }
        return <span key={i}>{op.text}</span>
      })}
    </p>
  )
}

export function BoardDiffModal({
  jobKey,
  boardId,
  onClose,
}: {
  jobKey: string
  boardId: string
  onClose: () => void
}) {
  const { locale } = useCatalogLocale()
  const copy = useUiCopy()
  const [data, setData] = useState<ComparePayload | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/jobs/${encodeURIComponent(jobKey)}/compare?board=${encodeURIComponent(boardId)}`, {
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("compare")
        return r.json()
      })
      .then(setData)
      .catch(() => setError(true))
    return () => ac.abort()
  }, [jobKey, boardId])

  const ops = useMemo(() => {
    if (!data?.master || !data.selected) return []
    if (data.selected.is_master) return [{ type: "same" as const, text: data.selected.text || "" }]
    return wordDiff(data.master.text || "", data.selected.text || "")
  }, [data])

  const selectedLabel = boardLabel(data?.selected?.board_id || boardId, locale)
  const masterLabel = boardLabel(data?.master?.board_id || "", locale)
  const identical = Boolean(data?.selected?.is_master) || (ops.length === 1 && ops[0]?.type === "same")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="board-diff-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-diff-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="board-diff-title" className="text-lg font-extrabold">
          {copy("board_diff_title")} · {selectedLabel}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {copy("board_vs_master")}
          {masterLabel ? ` (${copy("board_master")}: ${masterLabel})` : ""}
        </p>
        {error ? (
          <p className="mt-4 text-sm text-muted">{copy("listing_missing")}</p>
        ) : !data ? (
          <p className="mt-4 text-sm text-muted">…</p>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold">
              {data.selected?.company}
              {data.selected?.title ? ` · ${data.selected.title}` : ""}
            </p>
            {identical ? <p className="mt-2 text-sm text-muted">{copy("board_identical")}</p> : null}
            <div className="mt-3">{ops.length ? <DiffText ops={ops} /> : null}</div>
            {data.selected?.url ? (
              <a
                className="mt-4 inline-block text-sm font-semibold text-studio hover:underline"
                href={data.selected.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {copy("board_open_url")}
              </a>
            ) : null}
            {!data.full_description ? (
              <p className="mt-2 text-sm text-muted">{copy("excerpt_only")}</p>
            ) : null}
          </>
        )}
        <button
          type="button"
          className="mt-5 rounded-md border border-border px-3 py-2 text-sm font-semibold"
          onClick={onClose}
          data-testid="board-diff-close"
        >
          {copy("skill_certs_close")}
        </button>
      </div>
    </div>
  )
}
