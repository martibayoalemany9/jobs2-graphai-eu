"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { StudioHeader } from "@/components/studio-header"

type Detail = {
  job?: {
    title: string
    company: string
    country_iso2: string
    job_location: string
    is_remote: string
    appeared_at: string
    url: string
    description: string
    full_description: boolean
    availability: string
  }
  certs?: { certification_name: string; provider: string; certification_url: string }[]
  conferences?: { conference_name: string; conference_url: string; location: string }[]
  talks?: { talk_title: string; talk_url: string; conference_name: string }[]
  learn?: { name: string; uri: string; provider: string }[]
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Detail | null>(null)
  const [status, setStatus] = useState(200)

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(async (r) => {
        setStatus(r.status)
        return r.json()
      })
      .then(setData)
      .catch(() => setStatus(500))
  }, [id])

  const job = data?.job
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <StudioHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link href="/?view=jobs" className="text-sm font-semibold hover:underline">← Jobs</Link>
        {status === 404 || !job ? (
          <p className="mt-6">This listing is outside your plan cap or was not found.</p>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-muted">
              {job.company} · {job.country_iso2} · {job.job_location} · {job.is_remote || "on-site"}
            </p>
            <p className="mt-1 text-sm text-muted">{job.availability} · {job.appeared_at}</p>
            <a className="mt-2 inline-block font-semibold text-studio hover:underline" href={job.url} rel="noopener noreferrer" target="_blank">
              Open employer listing
            </a>
            <article className="mt-6 whitespace-pre-wrap text-sm leading-6">{job.description}</article>
            {!job.full_description ? (
              <p className="mt-2 text-sm text-muted">Excerpt only. Subscribe for the full description.</p>
            ) : null}
            {(data?.certs || []).length > 0 ? (
              <>
                <section className="mt-8">
                  <details className="group" data-testid="job-certs-fold">
                    <summary className="cursor-pointer font-extrabold">Certificates</summary>
                  <ul className="mt-2 list-disc pl-5 text-sm" data-testid="job-certs">
                    {(data?.certs || []).map((c) => (
                      <li key={c.certification_name}>
                        {c.certification_url ? (
                          <a href={c.certification_url} className="hover:underline" rel="noopener noreferrer" target="_blank">
                            {c.certification_name}
                          </a>
                        ) : (
                          c.certification_name
                        )}
                        <span className="text-muted"> · {c.provider}</span>
                      </li>
                    ))}
                  </ul>
                  </details>
                </section>
                {(data?.learn || []).length > 0 ? (
                  <section className="mt-6">
                    <h2 className="font-extrabold">Learn</h2>
                    <ul className="mt-2 list-disc pl-5 text-sm" data-testid="job-learn">
                      {(data?.learn || []).map((c) => (
                        <li key={c.uri}>
                          <a href={c.uri} className="hover:underline" rel="noopener noreferrer" target="_blank">
                            {c.name}
                          </a>
                          <span className="text-muted"> · {c.provider}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            ) : null}
            {(data?.conferences || []).length > 0 ? (
              <section className="mt-6">
                <h2 className="font-extrabold">Conferences</h2>
                <ul className="mt-2 list-disc pl-5 text-sm" data-testid="job-conferences">
                  {(data?.conferences || []).map((c) => (
                    <li key={c.conference_name}>
                      {c.conference_url ? (
                        <a href={c.conference_url} className="hover:underline" rel="noopener noreferrer" target="_blank">
                          {c.conference_name}
                        </a>
                      ) : (
                        c.conference_name
                      )}
                      {c.location ? <span className="text-muted"> · {c.location}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {(data?.talks || []).length > 0 ? (
              <section className="mt-6">
                <h2 className="font-extrabold">Talks</h2>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {(data?.talks || []).map((t) => (
                    <li key={t.talk_title}>
                      {t.talk_url ? (
                        <a href={t.talk_url} className="hover:underline" rel="noopener noreferrer" target="_blank">
                          {t.talk_title}
                        </a>
                      ) : (
                        t.talk_title
                      )}
                      <span className="text-muted"> · {t.conference_name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
