"use client"

import { useState } from "react"
import { useCatalogLocale, useUiCopy } from "./catalog-locale"
import { BoardDiffModal } from "./board-diff-modal"
import { boardLabel, boardMeta, uniqueBoards, type JobBoardMember } from "@/lib/job-boards"

export function JobBoardIcons({
  jobKey,
  boards,
  initialBoard = null,
}: {
  jobKey: string
  boards: JobBoardMember[]
  initialBoard?: string | null
}) {
  const { locale } = useCatalogLocale()
  const copy = useUiCopy()
  const list = uniqueBoards(boards)
  const [open, setOpen] = useState<string | null>(() => {
    if (!initialBoard) return null
    const hit = list.find((b) => b.board_id === initialBoard)
    return hit && !hit.is_master ? hit.board_id : null
  })
  if (!list.length) return null
  return (
    <>
      <ul
        className="mt-1 flex flex-wrap items-center gap-1"
        data-testid="job-board-icons"
        aria-label={copy("board_origin")}
      >
        {list.map((b) => {
          const meta = boardMeta(b.board_id)
          const label = boardLabel(b.board_id, locale)
          return (
            <li key={b.board_id}>
              <button
                type="button"
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] px-0.5 text-[9px] font-extrabold leading-none ${
                  b.is_master ? "ring-1 ring-primary ring-offset-1" : ""
                }`}
                style={{ background: meta.bg, color: meta.fg }}
                title={`${label}${b.is_master ? ` · ${copy("board_master")}` : ""}`}
                aria-label={label}
                data-testid="job-board-icon"
                data-board={b.board_id}
                data-master={b.is_master ? "1" : "0"}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(b.board_id)
                }}
              >
                {meta.letters}
              </button>
            </li>
          )
        })}
      </ul>
      {open ? <BoardDiffModal jobKey={jobKey} boardId={open} onClose={() => setOpen(null)} /> : null}
    </>
  )
}
