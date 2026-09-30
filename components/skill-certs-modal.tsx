"use client"

import { useEffect, useMemo, useState } from "react"
import { useCatalogLocale, useUiCopy } from "./catalog-locale"
import { catalogRowMatchesSkill, skillTagLabel, type CatalogCertRow } from "@/lib/skill-tags"

export type JobCert = {
  cert_id?: string
  certification_name: string
  provider: string
  certification_url?: string
  skill_regex?: string
  mention_regex?: string
}

export function SkillCertsModal({
  skillId,
  jobCerts = [],
  onClose,
}: {
  skillId: string
  jobCerts?: JobCert[]
  onClose: () => void
}) {
  const { locale } = useCatalogLocale()
  const copy = useUiCopy()
  const label = skillTagLabel(skillId, locale)
  const [related, setRelated] = useState<CatalogCertRow[]>([])

  useEffect(() => {
    const ac = new AbortController()
    fetch(`/api/certs?skill=${encodeURIComponent(skillId)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setRelated((d.certs || []) as CatalogCertRow[]))
      .catch(() => setRelated([]))
    return () => ac.abort()
  }, [skillId])

  const required = useMemo(
    () =>
      jobCerts.filter((c) =>
        catalogRowMatchesSkill(
          {
            cert_id: c.cert_id || "",
            certification_name: c.certification_name,
            provider: c.provider,
            skill_regex: c.skill_regex,
            mention_regex: c.mention_regex,
          },
          skillId,
        ),
      ),
    [jobCerts, skillId],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="skill-certs-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-certs-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="skill-certs-title" className="text-lg font-extrabold">
          {copy("skill_certs_title")} · {label}
        </h2>
        {required.length > 0 ? (
          <section className="mt-4">
            <h3 className="text-sm font-bold">{copy("skill_certs_required")}</h3>
            <ul className="mt-2 space-y-1 text-sm" data-testid="skill-certs-required">
              {required.map((c) => (
                <li key={c.cert_id || c.certification_name}>
                  {c.certification_url ? (
                    <a href={c.certification_url} className="font-semibold text-studio hover:underline" rel="noopener noreferrer" target="_blank">
                      {c.certification_name}
                    </a>
                  ) : (
                    <span className="font-semibold">{c.certification_name}</span>
                  )}
                  {c.provider ? <span className="text-muted"> · {c.provider}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="mt-4">
          <h3 className="text-sm font-bold">{copy("skill_certs_related")}</h3>
          {related.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{copy("skill_certs_empty")}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm" data-testid="skill-certs-related">
              {related.map((c) => (
                <li key={c.cert_id}>
                  {c.certification_url ? (
                    <a href={c.certification_url} className="font-semibold text-studio hover:underline" rel="noopener noreferrer" target="_blank">
                      {c.certification_name}
                    </a>
                  ) : (
                    <span className="font-semibold">{c.certification_name}</span>
                  )}
                  {c.provider ? <span className="text-muted"> · {c.provider}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <button
          type="button"
          className="mt-5 rounded-md border border-border px-3 py-2 text-sm font-semibold"
          onClick={onClose}
          data-testid="skill-certs-close"
        >
          {copy("skill_certs_close")}
        </button>
      </div>
    </div>
  )
}
