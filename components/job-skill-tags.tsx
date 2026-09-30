"use client"

import { useState } from "react"
import { useCatalogLocale } from "./catalog-locale"
import { SkillCertsModal, type JobCert } from "./skill-certs-modal"
import { skillTagLabel } from "@/lib/skill-tags"

export type JobSkill = {
  skill_id: string
  skill_label?: string
}

export function JobSkillTags({
  skills,
  jobCerts = [],
}: {
  skills: JobSkill[]
  jobCerts?: JobCert[]
}) {
  const { locale } = useCatalogLocale()
  const [open, setOpen] = useState<string | null>(null)
  if (!skills?.length) return null
  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="job-skill-tags">
        {skills.map((s) => (
          <li key={s.skill_id}>
            <button
              type="button"
              className="rounded-full border border-border bg-mint px-2.5 py-0.5 text-xs font-semibold hover:bg-pill"
              data-testid="job-skill-tag"
              data-skill={s.skill_id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(s.skill_id)
              }}
            >
              {skillTagLabel(s.skill_id, locale, s.skill_label)}
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <SkillCertsModal skillId={open} jobCerts={jobCerts} onClose={() => setOpen(null)} />
      ) : null}
    </>
  )
}
