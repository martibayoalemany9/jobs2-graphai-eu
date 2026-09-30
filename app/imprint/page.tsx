import type { Metadata } from "next"
import type { ReactNode } from "react"
import { StudioHeader } from "@/components/studio-header"
import { StudioFooter } from "@/components/studio-footer"

export const metadata: Metadata = {
  title: "Imprint — Graphai OÜ",
  description:
    "Provider information, company registration and banking details for Graphai OÜ pursuant to Section 5 DDG and Section 18(1) MStV.",
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="text-sm leading-relaxed">{value}</dd>
    </div>
  )
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-semibold text-studio hover:underline" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default function ImprintPage() {
  return (
    <div className="flex min-h-svh flex-col bg-bg" data-testid="imprint-page">
      <StudioHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-studio">Legal notice</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Imprint</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Provider information pursuant to Section 5 of the German Digital Services Act (DDG) and
          Section 18(1) of the German State Media Treaty (MStV). This notice covers{" "}
          <Ext href="https://jobs2.graphai.eu">jobs2.graphai.eu</Ext> together with the Graphai OÜ
          company imprint published at{" "}
          <Ext href="https://graphai.eu/imprint">graphai.eu/imprint</Ext>.
        </p>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">
          Service provider
        </h2>
        <dl className="mt-4">
          <Row
            label="Company"
            value={
              <address className="not-italic">
                Graphai OÜ
                <br />
                Tartu mnt 67/1-13b
                <br />
                Kesklinna district
                <br />
                10115 Tallinn
                <br />
                Harju County, Estonia
              </address>
            }
          />
          <Row
            label="Email"
            value={
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <a href="mailto:info@graphai.eu" className="font-semibold text-studio hover:underline">
                  info@graphai.eu
                </a>
                <a href="mailto:hello@graphai.eu" className="font-semibold text-studio hover:underline">
                  hello@graphai.eu
                </a>
              </span>
            }
          />
          <Row
            label="Website"
            value={
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <Ext href="https://graphai.eu">graphai.eu</Ext>
                <Ext href="https://jobs.graphai.eu">jobs.graphai.eu</Ext>
                <Ext href="https://jobs2.graphai.eu">jobs2.graphai.eu</Ext>
              </span>
            }
          />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">
          Management and content responsibility
        </h2>
        <dl className="mt-4">
          <Row label="Management Board" value="Management Board member: Martí Bayo Alemany" />
          <Row
            label="Editorial content"
            value="Where Section 18(2) MStV applies to editorial content, the person responsible is Martí Bayo Alemany, reachable at the registered business address above."
          />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">OpenPGP</h2>
        <dl className="mt-4">
          <Row
            label="Public key"
            value={
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <a href="/gpg.asc" className="font-semibold text-studio hover:underline">
                  jobs2.graphai.eu/gpg.asc
                </a>
                <Ext href="https://graphai.eu/gpg.asc">graphai.eu/gpg.asc</Ext>
              </span>
            }
          />
          <Row
            label="Fingerprint"
            value={<span className="font-mono text-[0.95em]">A610 3AD0 B59B A6D0 446F 1F57 A6AB 4AA2 739E 62D9</span>}
          />
          <Row
            label="Keyservers"
            value={
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <Ext href="https://keyserver.ubuntu.com/pks/lookup?search=0xA6103AD0B59BA6D0446F1F57A6AB4AA2739E62D9&fingerprint=on&op=index">
                  Ubuntu keyserver
                </Ext>
                <Ext href="https://keys.openpgp.org/vks/v1/by-fingerprint/A6103AD0B59BA6D0446F1F57A6AB4AA2739E62D9">
                  keys.openpgp.org
                </Ext>
              </span>
            }
          />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">
          Commercial register
        </h2>
        <dl className="mt-4">
          <Row label="Legal form" value="Estonian private limited company (osaühing)" />
          <Row label="Registry code" value="17550354" />
          <Row
            label="Registry"
            value="Registration Department of Tartu County Court, commercial register card no. 1."
          />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">Banking</h2>
        <dl className="mt-4">
          <Row label="Account holder" value="Graphai OÜ · Revolut Business" />
          <Row label="IBAN" value={<span className="font-mono">LT66 3250 0794 2676 6416</span>} />
          <Row label="BIC" value={<span className="font-mono">REVOLT21</span>} />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">
          Other applications
        </h2>
        <dl className="mt-4">
          <Row
            label="Jobs studio"
            value={<Ext href="https://jobs2.graphai.eu">jobs2.graphai.eu</Ext>}
          />
          <Row
            label="Jobs catalog"
            value={<Ext href="https://jobs.graphai.eu">jobs.graphai.eu</Ext>}
          />
          <Row
            label="Credit ratings"
            value={<Ext href="https://credit-ratings.graphai.eu">credit-ratings.graphai.eu</Ext>}
          />
          <Row
            label="Credit score"
            value={<Ext href="https://credit-search.graphai.eu">credit-search.graphai.eu</Ext>}
          />
          <Row
            label="Camera Control"
            value={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>Live FaceTime / webcam preview, WebGL looks, bitrate and codec monitoring.</span>
                <Ext href="https://video.graphai.eu">video.graphai.eu</Ext>
                <a
                  href="https://github.com/martibayoalemany9/CameraControl-mac"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:bg-mint"
                  title="macOS app on GitHub"
                  rel="noopener noreferrer"
                >
                  Mac
                </a>
              </span>
            }
          />
        </dl>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-studio">
          Registered contact person
        </h2>
        <dl className="mt-4">
          <Row
            label="Contact person"
            value={
              <address className="not-italic">
                Dalanta OÜ, registry code 14330221
                <br />
                Pärnu mnt 105
                <br />
                11312 Tallinn, Harju County, Estonia
              </address>
            }
          />
        </dl>

        <div className="mt-14 space-y-10">
          <div id="privacy">
            <h2 className="text-xl font-extrabold tracking-tight">Privacy information</h2>
            <p className="mt-3 leading-relaxed text-muted">
              jobs2.graphai.eu is operated by Graphai OÜ. The hosting provider may process technical
              request information such as IP address, access time, requested URL, referrer, browser,
              and operating system to deliver and secure the website.
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              Optional sign-in uses Clerk. Saved specialties, entitlements, and listing correction
              requests are stored in Google BigQuery in the EU. Paid subscriptions may be processed
              by Stripe or Revolut. Listing deletion or correction requests can be sent to{" "}
              <a href="mailto:hello@graphai.eu" className="font-semibold text-studio hover:underline">
                hello@graphai.eu
              </a>
              . Account deletion is available through the signed-in profile.
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              This processing supports delivery of the catalog, misuse prevention, technical
              administration, and security analysis. Where the GDPR applies, the legal basis is
              Article 6(1)(f) GDPR, and Article 6(1)(b) GDPR for signed-in accounts and paid access.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Disclaimer</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Despite careful review, no guarantee is given that all information is complete,
              correct, current, or continuously available. External websites remain the
              responsibility of their respective operators. Legal provisions may change and should
              be checked in their current official version.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Copyright</h2>
            <p className="mt-3 leading-relaxed text-muted">
              The content and design of this website are protected by applicable copyright law.
              Commercial reuse requires prior written permission from Graphai OÜ.
            </p>
          </div>
        </div>
      </main>
      <StudioFooter />
    </div>
  )
}
