# jobs2.graphai.eu — Jobs Intelligence Studio

| Field | Value |
| --- | --- |
| **Title** | jobs2.graphai.eu Design |
| **Author** | Graphai OÜ (draft for implementation) |
| **Date** | 2026-09-27 |
| **Status** | Draft (rev 3 — review-2 issues 1–5) |
| **Domain** | `https://jobs2.graphai.eu` |
| **Repo** | `https://github.com/martibayoalemany9/jobs2-graphai-eu` (new) |
| **Local path** | `/Users/username/jobs2-graphai-eu` |
| **Vercel team** | `team_2MzmUHEuxjEOmy13tfYnSTle` (`martibayoalemany-9387s-projects`) |
| **Vercel project** | `jobs2-graphai-eu` (new; sibling of `jobs-graphai-eu` `prj_glP6Z4iRFo1UKOcvrVGgnMqojdPO` and landing `graphai` `prj_3zrFIoH8fg9Ks3HSulGQqpHhyNAf`) |
| **GCP** | `poetic-sentinel-402405`, BigQuery location `EU` |

This document is the implementation contract. An engineer should be able to ship the GitHub repo + Vercel production site from it without guessing table columns, entitlement math, or chrome tokens. Harvest counts below are **snapshots**, not constants: re-query `apply_jobs.job_offers` at implementation start.

---

## Overview

`jobs.graphai.eu` is a Clerk-gated career-page studio (static Node + ClickHouse `graphai.jobs_*`, Revolut €15/month, GCP Spot apply). It is **not** being rewritten. `jobs2.graphai.eu` is a **new public jobs-intelligence product**: country and specialty views over the harvested BigQuery corpus in `apply_jobs.job_offers` (moving harvest; **do not freeze a row count** in code or tests). Snapshots on 2026-09-27: morning `bq show` 455,201 rows / 178 MiB; review-time 513,815–520,419; later the same day `COUNT(*)` **570,687** / **570,296** distinct URLs / **252,834,432** bytes (~241 MiB). Implementers **must** `SELECT COUNT(*) FROM apply_jobs.job_offers` before materialize and assert serving-table cardinality against that live count (1% tolerance), not against any number in this document.

The product has Clerk auth, a €5/month Revolut subscription after a **7-day app-side trial**, availability time-series, Eurostat unemployment overlay, and job-detail certificates/conferences.

The UI clones the live Grok App Builder snapshot at [https://grok.graphai.eu](https://grok.graphai.eu) (project `01a0ade3-db0e-76d3-86ce-263e45f910a6`): Plus Jakarta Sans, `theme-color #084539`, wordmark `graphai jobs`, nav `graphai.eu` / `companies` / `jobs studio`, sticky tabs **Map / List / Jobs / Settings**. First-class interactions are (A) specialty combobox + certification checkboxes + vertical job-count slider, and (B) country selector + bar plot of counts/kinds. Everything else (GCP apply, company gallery crawl, credits marketplace) stays on `jobs.graphai.eu`.

Serving rule: the web app **never** `SELECT` `apply_jobs.job_offers` (not `SELECT *`, not a column subset). It reads clustered, materialized jobs2 tables. Listings are entitlement-capped via **frozen** `public_rank` (1k ⊂ 10k ⊂ full for URLs ranked at first insert). Anonymous Map/bar **may show true country `n_total`** as a teaser (choropleth uses a log bucket scale). Job **listings** stay capped. Paid/operator job detail reads full text from restricted `job_descriptions`; anonymous/free get `description_excerpt` only.

---

## Background & Motivation

### Current state (inspected, not invented)

| System | What it actually is |
| --- | --- |
| [grok.graphai.eu](https://grok.graphai.eu) | Static Grok snapshot. HTTP 200 on Vercel (`x-vercel-id` `fra1`). Header `graphai jobs`, nav `graphai.eu` / `companies` / green `jobs studio` pill, sticky Map/List/Jobs/Settings. CSS [assets/styles-zhtf7TkA.css](https://grok.graphai.eu/assets/styles-zhtf7TkA.css): `--font-sans: "Plus Jakarta Sans"`, `--color-primary:#084539`, `--color-studio:#1b8f4a`, `--bg:#f7fbf8`. Live copy showed 1,375 jobs / 163 listed / 33 countries — **catalog snapshot**, not BigQuery. |
| [jobs.graphai.eu](https://jobs.graphai.eu) | Static site + `/api/*` (`/Users/username/jobs-graphai-eu`). Light palette ink `#084539` in `public/styles.css`. Clerk FAPI `clerk.graphai.eu` (`public/clerk-auth.js`). Revolut Merchant API in `lib/pay.js` (`REVOLUT_API_VERSION 2026-04-20`, `SUB_PRICE_CENTS = 1500`). ClickHouse Cloud `b23f71a4si.europe-west2.gcp.clickhouse.cloud:8443`. E2E in `e2e/`. Sentry org `graphai-ou`, region `de.sentry.io`. |
| [graphai.eu](https://graphai.eu) | Next.js 16 App Router in `/Users/username/graphai`, **but** `output: 'export'` static HTML. Do **not** copy `output: 'export'` — jobs2 needs SSR + Route Handlers. |
| BigQuery `apply_jobs` | Harvested offers. `job_offers.country` is messy free text (`DE` + `Germany` + `UK` + `United States of America` + empty). Certs/conferences already loaded by `~/deepline/data/karlsruhe-public-co-job-apps/gcp_spot/load_job_certs_and_conferences.py`. |
| Apply Spot VMs | `apply-spot-*` in `europe-west1-d`, `/opt/apply`, heartbeat `/opt/apply/HEARTBEAT`, idle shutdown 2700s (`watchdog.sh`), SSH `~/.ssh/apply_spot`, cap 200 VMs / ~€200 (`lib/gcp-spot.js`). |

Pain: the Grok map is a 2026-09-16 sample; the real corpus is a **moving** harvest (eu10k MERGE into `job_offers`, still growing during this review). There is no public, entitlement-capped, country-normalized intelligence UI over that corpus, no availability time-series, and no €5 jobs2 plan.

### Live `apply_jobs` facts (moving harvest — re-query; do not hardcode)

**Implementer rule:** before the first materialize, run:

```sql
SELECT COUNT(*) AS n, COUNT(DISTINCT url) AS urls, COUNT(*) / 1024 / 1024 AS approx_ignore
FROM `poetic-sentinel-402405.apply_jobs.job_offers`;
-- then
-- ASSERT ABS(n_serving - n_source) / n_source < 0.01
```

Snapshots on **2026-09-27** (project `poetic-sentinel-402405`, location `EU`) — illustrative only:

| When | `job_offers` rows | Distinct URLs | Bytes |
| --- | --- | --- | --- |
| Early draft `bq show` | 455,201 | 454,810 | 177,986,691 |
| Review `bq show` | 513,815 | 513,424 | 215,693,062 |
| Review `__TABLES__` minutes later | 520,419 | 520,028 | — |
| Revision `COUNT(*)` | **570,687** | **570,296** | **252,834,432** |

Revision-time description density: `LENGTH(description)>40` **248,168**; avg length **~555**; non-empty country **559,474**. **30** raw `country` values have **>1,000** rows. CZ is a top market (do not omit it).

| Table | Snapshot rows (revision) | Notes |
| --- | --- | --- |
| `job_offers` | 570,687 (moving) | Core corpus. Schema unchanged. |
| `job_skills` | 14,824 | Sparse vs corpus. |
| `job_certifications` | 151,349 (was 34,004 earlier the same day — loader re-ran) | Cap 6 certs/job in loader SQL. Re-query. |
| `company_conferences` | 35,400 (morning) | Cap 3 conferences/job. Re-query. |
| `certification_catalog` | 49 | AWS/GCP/Azure/CKA/CISSP/SAP/etc. `cert_id` values include `az-204`. |
| `conference_catalog` | 28 | 2026 events. |
| `conference_talks` | **3,578** | KubeCon, FOSDEM, SAP TechEd, Devoxx, QCon, … |
| `job_conference_talks` | **61,498** | Up to 3 talks/job. |
| `job_position_certs_conferences` | 422,309 (morning) | Nested ARRAY STRUCT per job. Re-query. |
| `skill_cert_map` | 18 | `skill`, `cert_id` |
| `skill_conf_map` | 20 | `skill`, `conf_id` |
| `job_offers_ai` | missing | `bq show` empty; do not depend on it. |

Top `job_offers.country` at revision `COUNT`: `DE` 286,731; **`CZ` 84,706**; **`NL` 71,219**; `UK` 32,043; `US` 15,982; `(empty)` 11,213 (`NULL` 9,512 + `""` 1,701); `FR` 9,663; plus mixed names (`United States of America` 3,464, `Germany`, `unknown`, `EU (other)`, Eurostat `EL`, `China`, `Korea, Republic of`). **92 raw country strings.** Parser must emit ISO-3166 alpha-2 via table `country_map` (not `geo-markets.js` `COUNTRY_NAMES` alone); `UK` → `GB`; `EL` → `GR`; unknown → `ZZ`.

`appeared_at` is a **polymorphic STRING**: sampled Reed `dd/mm/yyyy` (`27/09/2026`) and EURES epoch-ms (`1789434768428`) in the same column. Do not `CAST(appeared_at AS TIMESTAMP)` blindly.

`job_offers` **live schema** (do not invent columns):

```
company STRING
title STRING
job_location STRING
headquarters_location STRING
is_remote STRING
country STRING
url STRING
appeared_at STRING
source STRING
description STRING
applied BOOLEAN
applied_at TIMESTAMP
applied_status STRING
applied_source STRING
```

Join key used by the certs loader: `job_certifications.job_url = job_offers.url` (and `job_skills.url`). Harvest MERGE key (eu10k `harvest_toward_1m.py`): lowercased URL with query/hash and trailing slash stripped.

Env table names (values only, from `~/.env` keys — no secrets): `BQ_TABLE_JOB_OFFERS`, `BQ_TABLE_JOB_SKILLS`, `BQ_TABLE_JOB_CERTIFICATIONS`, `BQ_TABLE_COMPANY_CONFERENCES`, `BQ_TABLE_CERTIFICATION_CATALOG`, `BQ_TABLE_CONFERENCE_CATALOG`, `BQ_TABLE_JOB_POSITION_CERTS_CONFERENCES`, `BQ_VIEW_JOB_OFFERS_CERTS_CONFERENCES`, `BQ_TABLE_CONFERENCE_TALKS`, `BQ_TABLE_JOB_CONFERENCE_TALKS`.

---

## Goals & Non-Goals

### Goals

1. New Next.js App Router TypeScript app at `/Users/username/jobs2-graphai-eu`, published to GitHub `martibayoalemany9/jobs2-graphai-eu` and Vercel `jobs2-graphai-eu`, domain `jobs2.graphai.eu`.
2. Visual language of live grok.graphai.eu (tokens below).
3. Public area: ≤ 1,000 offers per `country_iso2`, deterministic sample.
4. Own Clerk application (dev + production-upgradeable via `clerk init --framework next`). Not mail-graphai.eu keys, not `clerk.graphai.eu` / `money-briefing-001`.
5. Revolut ~€5/month (500 cents) after 7-day trial. Reuse `jobs-graphai-eu/lib/pay.js` Merchant API pattern; new plan name; no secrets in repo.
6. Entire BQ corpus associated to `country_iso2`; jobs2-specific tables in `apply_jobs_jobs2_prod` / `apply_jobs_jobs2_dev`.
7. Daily Playwright availability probe on apply-spot VMs; time-series + Eurostat overlay; unavailable jobs remain visible behind a filter.
8. UI A: specialty combobox + cert checkboxes + vertical slider. UI B: country + bar plot of counts/kinds. Profile specialties filter listings.
9. First login **must** select specialties before Jobs / List / Settings (Map stays public).
10. Sentry project `jobs2-graphai-eu`, org `graphai-ou`, `de.sentry.io`, `@sentry/nextjs`, DSN from env.
11. Playwright QA (all features except billing checkout) + defensive pentest scripts in-repo; GitHub issues for failures.
12. Operator `martibayoalemany@gmail.com` (and `googlemail.com` alias) full access without paying.
13. Free-mode toggle: 10k/country cap even for paid users.
14. Job detail shows related certificates (catalog + edx/coursera from ClickHouse import) and conferences/talks.
15. Prod/dev BigQuery stay synchronized. Cost/scaling report for 1k / 100k / 1M MAU.
16. After go-live, email the operator with the Vercel URL and IONOS DNS instructions.

### Non-goals

- Do not migrate or rewrite `jobs-graphai-eu`.
- Do not implement GCP apply, company gallery crawl, credits, inbox, or ranker.
- Stripe is **not** primary. Mention only as the documented fallback already in `pay.js`.
- Do not pentest third-party sites (employer ATS, Revolut, Clerk, Eurostat).
- Do not put secrets, tokens, DSNs, or private keys in this document or in git.
- Do not use Next `output: 'export'` (landing site pattern) — jobs2 is a server app.
- Do not reuse Clerk keys from `jobs-graphai-eu/public/clerk-auth.js` (or from mail / money-briefing). Refer to that file path only; do not paste publishable keys into this contract.

---

## Key Decisions

1. **New Next.js App Router + TypeScript app, not an extension of `jobs-graphai-eu`.** Rationale: Clerk Next SDK, Sentry Next SDK, Vercel Fluid Compute, Tailwind v4 tokens matching grok CSS. The existing jobs site is a static `public/` + Node `api/*.js` app with `vercel.json` `framework: null`.

2. **Repo path `/Users/username/jobs2-graphai-eu`, GitHub `martibayoalemany9/jobs2-graphai-eu`.** Matches `graphai` / `jobs-graphai-eu` ownership. Private repo until public launch is explicitly requested (default **public** so Clerk/Vercel Git integration works like jobs; confirm in Open Questions).

3. **BigQuery split.** `apply_jobs` remains the harvest source of truth (writers: eu10k MERGE, certs loader). New datasets `apply_jobs_jobs2_prod` and `apply_jobs_jobs2_dev` (EU) hold jobs2 tables: `job_offers_country`, `job_descriptions`, `country_map`, profiles, entitlements, snapshots, availability, KPI, imported ClickHouse certs. Production web reads **only** jobs2 tables. Dev dataset is a scheduled copy of **non-PII** serving tables (never prod `profiles` / `entitlements` / `payments`).

4. **Entitlement matrix.** Anonymous 1k/country **listings**; signed-in free **or** trial 10k/country listings; paid Revolut **or** operator unlimited listings. Settings **free-mode** forces the 10k listing cap even for paid/operator. Caps apply per `country_iso2` on **listing** APIs. Map/bar **country totals** (`n_total`) are visible to anonymous as a teaser.

5. **Public listings use frozen `public_rank`, not a `job_public_sample` table.** Initial backfill: `ROW_NUMBER() OVER (PARTITION BY country_iso2 ORDER BY FARM_FINGERPRINT(url_norm))`. Later inserts **append** ranks (`MAX(public_rank)+n` per country among new URLs only). Existing ranks never change, so the 1k prefix is stable for URLs already ranked. There is **no** `job_public_sample` table. Optional full rebalance is a manual operator script, out of v1.

6. **Country association.** Table `country_map(raw_string → country_iso2)` seeded from live `SELECT country, COUNT(*) FROM job_offers GROUP BY 1` plus explicit maps (`UK`/`GB`/`Great Britain` → `GB`, `EL` → `GR`, `China` → `CN`, `Korea, Republic of` → `KR`, empty/`unknown`/`EU (other)` → TLD fallback else `ZZ`). Port `geo-markets.js` `TLD_COUNTRY` / `hostCountry` as SQL fallback after a map miss. Do not rely on `nameCountry` `s.includes(n)` alone.

7. **Specialty clusters = `SKILL_CATALOG` from `jobs-graphai-eu/lib/skills-catalog.js`.** 18 ids: `python`, `javascript`, `typescript`, `sql`, `cloud`, `ml`, `systems`, `embedded`, `networking`, `security`, `dataeng`, `product`, `ux`, `project`, `comms`, `leadership`, `stakeholder`, `problem`. **AND-filter checkboxes** = `certification_catalog.cert_id` only (49 rows; includes `az-204`). ClickHouse edx/coursera/Google Skills rows are **catalog extras** on job detail / a “learn” list — they are **not** AND-filter keys unless also present as `job_offer_certs` rows. Combobox filters **both** the cert checkbox list **and** the listings.

8. **Cert filter is AND.** A job matches iff it is associated with **every** selected catalog `cert_id` via `job_offer_certs`. `k=0` (empty selection) = **no cert constraint**. Join on `job_key` and `country_iso2`. Documented alternative: OR, rejected.

9. **Vertical slider is a stepped k-index (0..N) and a third input with delayed commit.** Checkboxes are source of truth. Prefix order = `?certs=` list order. Thumb position = integer `k`, **not** job count. Job count is a live label (`aria-valuetext`). Pointer-up rewrites `?certs=` to the prefix of length `k`. Combobox + checkboxes remain the primary surfaces; drag is secondary.

10. **First-login gate is UX in `proxy.ts`, authz in Route Handlers.** On `PUT /api/profile`, write specialties to **Clerk `publicMetadata.specialties`** and to BQ `profiles` (audit). Default Clerk session JWTs do **not** include `public_metadata`. PR 8 **must** customize the Clerk **session token template** (dev instance, and the same JSON on the **production** instance at upgrade):

    ```json
    { "specialties": "{{user.public_metadata.specialties}}" }
    ```

    Pin the claim key as **`specialties`**. `proxy.ts` reads **`sessionClaims.specialties` only** (if Clerk stringifies the array, `JSON.parse`). Empty / missing / `[]` → onboard Jobs/List/Settings. **Do not** call `currentUser()` or BigQuery on every document request. Map (`/` and `/?view=map`) is public without specialties. `proxy.ts` redirects are **UX only**; IDOR/caps are enforced in Route Handlers (`capFor()` + `public_rank`). Next 16 `proxy.ts` is a routing layer, not a security boundary.

11. **App-side 7-day trial is the v1 primary.** `trial_started_at = first successful PUT /api/profile`. Revolut plan `Graphai Jobs2` is `P1M` / **500 cents** (same amount convention as `pay.js` 1500 = €15). Do **not** depend on a Merchant `P7D` amount-0 phase (`ensureRevolutPlan()` in jobs has no trial phase). Do **not** copy `REVOLUT_ORDER_ID` or the hosted payment-link fallback. Webhook: `ORDER_COMPLETED` / `ORDER_AUTHORISED` → `paid`; `SUBSCRIPTION_CANCELLED` / `SUBSCRIPTION_EXPIRED` / equivalent → `lapsed`. HMAC as `revolutSignatureOk`. Checkout E2E out of QA.

12. **Availability worker.** Python Playwright on `apply-spot-*`. Insert default `availability = 'available'` (optimistic) until `miss_streak >= 3` → `probably_unavailable`. robots.txt skip / worker crash → **leave status unchanged**. UI filter default = `all` until that `country_iso2` has ≥1 row in `job_availability_checks`; then default `available`. Shard modulus `GREATEST(23, CAST(CEIL(n_urls / 30000) AS INT64))` with **30,000 URLs/VM/day** cap so coverage stays ≈ modulus days as harvest grows. New-URL union: parse `appeared_at` as `dd/mm/yyyy` **or** epoch-ms; unparseable rows use `ingested_at` within 48h.

13. **Economic KPI.** Primary: Eurostat Statistics API dataset `une_rt_m` (monthly unemployment rate). Fallback: World Bank `SL.UEM.TOTL.ZS`. Stored in `kpi_country_monthly`. Overlay on the country jobs curve. Destatis/OECD/ECB are **not** wired in v1.

14. **Sentry.** New project `jobs2-graphai-eu`. `@sentry/nextjs` with errors + tracing. `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` from Vercel env. `release = VERCEL_GIT_COMMIT_SHA`. Optional tunnel `/monitoring`. Source maps upload on production build.

15. **QA + pentest in the same repo.** `e2e/*.spec.ts` Playwright except billing. `scripts/pentest/` defensive only (headers, authz, IDOR, rate limit, injection **detection** on our APIs, no exploit payloads). `npm run test:e2e` / `npm run test:pentest`. GitHub Actions on PR. Failures → `gh issue create` (not Linear; jobs.graphai.eu uses Linear GRA — jobs2 uses GitHub issues per req 16–19).

16. **Vercel region `fra1`.** Matches live grok (`x-vercel-id: fra1::…`). Framework Next.js (not `framework: null`). Fluid Compute on. ISR/CDN for public aggregates (`revalidate: 300`).

17. **Operator entitlement is server-side.** Allowlist is **only** `martibayoalemany@gmail.com` and `martibayoalemany@googlemail.com` (canonicalised). Plus-addresses (`martibayoalemany+jobs2@gmail.com`) are **not** operators. The jobs.graphai.eu `lib/admins.js` regex (`hello@graphai.eu`, `martibayoalemany@graphai.eu`, `martibayoalemany4@gmail.com`, `/^marti[._-]?bayo[._-]?alemany/`) **does not apply**. Plus BQ `profiles.is_operator`. Never trust a client flag.

18. **Serving store for 1M MAU is precomputed JSON + KV, not per-request BQ.** V1 ships BQ + materialized tables + Cache-Control + Vercel Firewall rate limits. The 1M playbook (GCS/CDN snapshots, KV) is a gated milestone, not v1.

19. **Paid full description lives in `job_descriptions(job_key, description)`**, clustered by `job_key`. Only the paid/operator job-detail handler SELECTs it. Anonymous/free get `description_excerpt`. Never `applied_*`.

20. **Rate limit in v1:** Vercel Firewall 60 req/min/IP on `/api/jobs*` and 10 req/min on `/api/billing/checkout`. No ACAO on document routes (same-origin Next app). APIs do not send `Access-Control-Allow-Origin: https://jobs2.graphai.eu` in a way that blocks preview; pentest default base URL is the **preview** deployment.

21. **Legal v1:** footer links to `https://graphai.eu/imprint` and Graphai privacy on graphai.eu. Cookie banner only if Vercel Analytics / HubSpot is enabled. `DELETE /api/profile` plus Clerk `user.deleted` webhook purge BQ rows.

22. **`job_key` encoding is one expression, written twice.** Hourly materialize is a BigQuery scheduled query — **no** JS UDF, **no** Python-only hourly path. Canonical BQ:

    ```sql
    TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')
    ```

    Matching TS (`lib/job-key.ts`): `base64url(sha256(utf8(url_norm)).subarray(0, 18))` — 18 raw bytes, unpadded 24-char base64url. Golden tests in `lib/job-key.test.ts` include a URL whose standard base64 contains `+` or `/`.

---

## Proposed Design

### High-level architecture

```mermaid
flowchart TB
  subgraph clients [Browsers]
    Anon[Anonymous]
    User[Clerk signed-in]
  end

  subgraph vercel [Vercel fra1 — jobs2-graphai-eu]
    Next[Next.js App Router]
    MW[proxy.ts gate]
    API[Route Handlers]
    ISR[ISR public aggregates]
    Sentry[@sentry/nextjs]
  end

  subgraph identity [Identity and pay]
    Clerk[Clerk app jobs2-graphai-eu]
    Revolut[Revolut Merchant API]
  end

  subgraph gcp [GCP poetic-sentinel-402405 EU]
    AJ[apply_jobs.job_offers + certs/talks]
    P[apply_jobs_jobs2_prod]
    D[apply_jobs_jobs2_dev]
    Sync[Scheduled copy prod to dev]
    Spot[apply-spot-* Playwright availability]
  end

  subgraph ch [ClickHouse Cloud]
    Certs[graphai.jobs_skill_certs]
  end

  subgraph kpi [Public KPI]
    Euro[Eurostat une_rt_m]
    WB[World Bank SL.UEM.TOTL.ZS]
  end

  Anon --> Next
  User --> Clerk
  User --> Next
  Next --> MW --> API
  API --> P
  ISR --> P
  Clerk --> API
  API --> Revolut
  AJ --> P
  Certs --> P
  Euro --> P
  WB --> P
  P --> Sync --> D
  Spot --> P
  Next --> Sentry
```

### Visual language (source of truth: live grok)

Reproduce **both** grok’s `@theme --color-*` tokens (Tailwind utilities `bg-mint`, `text-foreground`, `bg-studio`) **and** the `:root` aliases from `https://grok.graphai.eu/assets/styles-zhtf7TkA.css` (fetched 2026-09-27). Pasting only `:root { --bg: … }` will **not** produce `bg-mint`.

```css
@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --color-bg: #f7fbf8;
  --color-surface: #fff;
  --color-foreground: #084539;
  --color-muted: #3d6b61;
  --color-primary: #084539;
  --color-primary-foreground: #f4faf7;
  --color-primary-hover: #06382e;
  --color-studio: #1b8f4a;
  --color-border: #d7e4df;
  --color-mint: #e8f3ee;
  --color-pill: #f3f6f5;
  --color-ring: #084539;
  --color-map-ocean: #e4efe9;
  --color-ok: #1b8f4a;
  --color-ok-bg: #e8f3ee;
  --color-warn: #7a5c20;
  --color-warn-bg: #f4ecdc;
  --color-danger: #8f2d2d;
  --color-danger-bg: #f6e8e8;
}
:root {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --bg: #f7fbf8;
  --surface: #fff;
  --foreground: #084539;
  --muted: #3d6b61;
  --primary: #084539;
  --primary-foreground: #f4faf7;
  --primary-hover: #06382e;
  --studio: #1b8f4a;
  --border: #d7e4df;
  --mint: #e8f3ee;
  --pill: #f3f6f5;
  --map-ocean: #e4efe9;
  --map-empty: #d5e4dd;
  --map-1: #c5ddd4;
  --map-2: #9cc4b6;
  --map-3: #6a9e8e;
  --map-4: #3d6b61;
  --map-5: #1b8f4a;
  --map-6: #084539;
  --ok: #1b8f4a;
  --warn: #7a5c20;
  --danger: #8f2d2d;
}
```

| Chrome | Spec |
| --- | --- |
| `<meta name="theme-color">` | `#084539` |
| Wordmark | `graphai jobs`, `text-[28px] font-extrabold lowercase tracking-[-0.04em]` |
| Nav | `graphai.eu` → `https://graphai.eu`; `companies` → `https://jobs.graphai.eu/companies/` (sibling, no new gallery); `jobs studio` green pill `bg-studio text-primary-foreground rounded-[10px]` → `/?view=map` |
| Sticky tabs | `Map` / `List` / `Jobs` / `Settings`, `role="tablist"`, selected `bg-mint text-foreground`, others `text-muted hover:bg-mint` |
| Font | `next/font/google` `Plus_Jakarta_Sans` weights 400–800 (do not depend on Google Fonts CSS in HTML the way `public/grok.html` does) |
| Default canvas | **Light mint**, not zinc-950. Grok’s `prefers-color-scheme: dark` utilities exist (`dark:bg-zinc-950`); v1 refuses a dark default. |
| Footer | Links to `https://graphai.eu/imprint` and Graphai privacy. Cookie banner only if analytics/HubSpot is on. |

`jobs.graphai.eu/public/styles.css` is a related **light** palette (same ink `#084539`, mint, Plus Jakarta Sans) — use it only as a secondary reference. Do not copy landing `Archivo` / `Instrument Serif`.

### Application chrome and routes

```
/                    Map tab (country choropleth + bar + time-series)
/?view=list          List tab (country table + stacked specialty bars)
/?view=jobs          Jobs tab (specialty combobox, cert checkboxes, slider, listings)
/?view=settings      Settings (subscription, free-mode, specialties edit)
/onboarding          First-login specialty picker (blocked until saved)
/jobs/[id]           Job detail (certs + conferences + talks)
/sign-in/*           Clerk
/sign-up/*           Clerk
```

Tabs are client state (`?view=`) inside the same studio shell so the header/tabs never remount. Deep links work.

### UI component A — specialty / certs (Jobs tab)

```
┌ Specialty cluster  (combobox, SKILL_CATALOG)     ┐
│ python ▾   ← filters cert list AND listings       │
├ Certifications (catalog cert_id checkboxes)       ┤
│ ☑ aws-saa   ☐ cka   ☑ az-204   ☐ cissp            │
│  (soft clusters: empty-certs state is valid)      │
│                                                   │
│  k-index slider (0..N)     live label: 1284 jobs  │
│   ▲  k=2  ●  (thumb = k, not job count)           │
│   ▼  k=0  (no cert constraint)                    │
└───────────────────────────────────────────────────┘
```

- Combobox selects one `SKILL_CATALOG` id. It filters (1) which **catalog** cert checkboxes are shown (`skill_regex` / `skill_cert_map.skill` intersect the cluster) and (2) listings (`specialties` contains that id, or all clusters if combobox is “all”). Soft clusters (`comms`, `problem`) often have **zero** catalog certs — show an empty-certs state, do not invent ids. ClickHouse extras do **not** appear as AND checkboxes.
- Checkboxes toggle catalog `cert_id` in `?certs=` (comma list; **order = selection order** = prefix order). `az-204` is a real `certification_catalog.cert_id` from `certification_catalog.jsonl`, not from `KNOWN_CERTS`.
- Slider: **custom** 40×240px vertical track (do not rely on `appearance: slider-vertical` in Safari/Firefox). `aria-orientation="vertical"`, `aria-valuemin=0`, `aria-valuemax=N`, `aria-valuenow=k` (the index), `aria-valuetext="{n} jobs"`. This **is** a third input: dragging previews prefix `certs[0..k)`; **pointer-up** commits by rewriting `?certs=`. Checkboxes remain source of truth if the user clicks them.

AND count (`k >= 1`). Join `job_key`; filter `c.country_iso2` so clustering is used. Wrap `GROUP BY` so the outer query is a scalar:

```sql
SELECT COUNT(*) AS n
FROM (
  SELECT c.job_key
  FROM job_offer_certs c
  JOIN job_offers_country j ON j.job_key = c.job_key
  WHERE c.country_iso2 = @cc
    AND j.country_iso2 = @cc
    AND (@cap IS NULL OR j.public_rank <= @cap)
    AND c.cert_id IN UNNEST(@certs)
    AND (
      ARRAY_LENGTH(@sp) = 0 OR EXISTS (
        SELECT 1 FROM UNNEST(j.specialties) s WHERE s IN UNNEST(@sp)
      )
    )
  GROUP BY c.job_key
  HAVING COUNT(DISTINCT c.cert_id) = ARRAY_LENGTH(@certs)
)
```

`k = 0` (empty `@certs`) is **not** `HAVING COUNT = 0`. It is:

```sql
SELECT COUNT(*) AS n
FROM job_offers_country j
WHERE j.country_iso2 = @cc
  AND (@cap IS NULL OR j.public_rank <= @cap)
  AND (
    ARRAY_LENGTH(@sp) = 0 OR EXISTS (
      SELECT 1 FROM UNNEST(j.specialties) s WHERE s IN UNNEST(@sp)
    )
  )
```

`GET /api/jobs/cert-curve`: anonymous runs the above against `public_rank <= 1000` and returns an **empty-state** (`n=0` points + copy “Sign in to score certifications on the full set”) when the sample AND is 0. Signed-in free/trial/paid uses the caller’s cap (10k / unlimited). Do not run anonymous AND over the full `job_offer_certs` (that leaks harvest size).

### UI component B — country (Map + List)

- Country `<select>` populated from view `country_daily_latest` (defined below). Include `ZZ` as “Unknown”.
- Bar plot: true `n_total` (and specialty kinds) — **anonymous is allowed to see country totals** because the product ask is “select a country, see job counts on a bar plot”. Listings remain capped.
- Choropleth color: **log buckets** (`--map-1`…`--map-6`), not a linear map of `min(n,1000)`. Signed-in Map may label exact `n_total`; anonymous Map may still send `n_total` on `/api/countries` for the bar/select.
- Kinds of jobs = `specialties` distribution (`country_specialty_counts`).
- Availability filter: `available` / `probably_unavailable` / `all`. **Default `all` until that country has ≥1 probe row; then default `available`.** Unavailable jobs remain listed when filter is `all` or `probably_unavailable`.
- Time-series: `job_count_daily` line + dashed KPI overlay.

Profile specialties: after onboarding, List/Jobs default to combobox ∩ `publicMetadata.specialties`. User can widen to all clusters.

### Job detail

Route `/jobs/[id]` where `id` is `job_key`. **Single encoding** (BQ scheduled query + TS; no JS UDF, no Python hourly helper):

```sql
-- BigQuery (hourly materialize.sql). SHA256 of UTF-8 STRING; first 18 bytes;
-- standard base64 then +/ → -_ ; 18 bytes → 24 chars, no pad.
TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')
```

```ts
// lib/job-key.ts — same 18 raw bytes, Node/WebCrypto base64url (unpadded)
job_key = base64url(sha256(utf8(url_norm)).subarray(0, 18))
```

Golden vectors (`lib/job-key.test.ts`; `url_norm` already lowercased, query/hash/slash stripped):

| `url_norm` | standard `TO_BASE64` (18 bytes) | `job_key` (base64url) |
| --- | --- | --- |
| `https://example.com/jobs/0` | `WW/lTzJcDv0RV1K2Ze1n3Vhh` (contains `/`) | `WW_lTzJcDv0RV1K2Ze1n3Vhh` |
| `https://x.com/job?a=1` | `LBok6LHiGiQLMFWvExCnd+WZ` (contains `+`) | `LBok6LHiGiQLMFWvExCnd-WZ` |

If a future Node/`crypto` change disagrees with BQ `SHA256`, **BQ wins** for stored keys; fix TS, do not fork encodings.

Show: title, company, `country_iso2` + `job_location`, `is_remote`, `appeared_at`, description, outbound `url` (`rel=noopener noreferrer`), related **catalog** certificates (AND-association), related conferences and up to 3 talks, plus a “Learn” list of ClickHouse/seed edx/coursera links **by specialty** (catalog extras, not job-mentioned).

Description: anonymous/free → `description_excerpt` (1,200 chars) from `job_offers_country`. Paid/operator → full `job_descriptions.description` (same handler, extra SELECT only if `cap === null` and not free-mode). Never `applied_*`.

IDOR: 404 if `public_rank` is outside the caller’s listing cap, even if they guess `job_key`. Paid-only full text is a second check: if not paid/operator, do not query `job_descriptions`.

### Auth, onboarding, Settings

```mermaid
sequenceDiagram
  participant B as Browser
  participant MW as proxy.ts
  participant Clerk as Clerk jobs2 app
  participant API as /api/profile
  participant BQ as profiles table

  B->>MW: GET /?view=jobs
  Note over MW: UX only — sessionClaims.specialties, no BQ, no currentUser()
  alt no session
    MW->>B: 200 public Map (n_total teaser; listings 1k)
  else session, empty sessionClaims.specialties
    MW->>B: 307 /onboarding (Jobs/List/Settings only)
    B->>API: PUT specialties
    API->>Clerk: publicMetadata.specialties
    API->>BQ: MERGE profiles (audit)
    B->>MW: GET /?view=jobs
  else session, specialties set
    MW->>B: studio
  end
```

`GET /?view=map` and `/` never redirect to onboarding.

Settings tab:

- Clerk `<UserButton />`
- Specialty editor (multi-select) via **`PUT /api/profile`** only
- Free-mode toggle (`PUT /api/profile` `{ free_mode: true }`)
- `DELETE /api/profile` (account data purge)
- Subscription card: trial days remaining from `trial_started_at`; after day 7 a Revolut CTA (`POST /api/billing/checkout`). `lapsed` shows the CTA again. Operator sees “operator — unlimited” and can still enable free-mode.

### Repo layout

```
/Users/username/jobs2-graphai-eu/
  app/
    layout.tsx
    page.tsx
    onboarding/page.tsx
    jobs/[id]/page.tsx
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    api/
      countries/route.ts
      countries/[iso2]/route.ts
      countries/[iso2]/series/route.ts
      jobs/route.ts
      jobs/[id]/route.ts
      jobs/cert-curve/route.ts
      certs/route.ts
      profile/route.ts
      billing/checkout/route.ts
      billing/revolut/route.ts
      webhooks/clerk/route.ts
      health/route.ts
    global-error.tsx
    globals.css
  components/
    studio-header.tsx
    studio-tabs.tsx
    country-bar.tsx
    country-map.tsx
    time-series.tsx
    specialty-certs-panel.tsx
    vertical-job-slider.tsx
    job-detail.tsx
    free-mode-toggle.tsx
  lib/
    bq.ts
    country.ts          # country_map client helper + TLD fallback
    skills-catalog.ts   # copy SKILL_CATALOG (not KNOWN_CERTS as checkbox ids)
    entitlement.ts
    revolut.ts          # 500 cents; no REVOLUT_ORDER_ID fallback
    profile.ts
    job-key.ts          # TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm),1,18)), '+/', '-_')
    job-key.test.ts     # golden vectors including + and / in standard base64
    operators.ts
    rate-limit.ts
  proxy.ts              # UX redirects only
  instrumentation.ts
  sentry.client.config.ts
  sentry.server.config.ts
  sentry.edge.config.ts
  e2e/
  scripts/
    pentest/
    bq/
      ddl.sql
      country_map_seed.sql
      materialize.sql
      snapshot.sh
      rebalance_public_rank.sql
      sync_dev.sh
      import_clickhouse.py
      ingest_kpi.py
    workers/
      availability_check.py
      hb_tick.sh
      watchdog.sh
  playwright.config.ts
  vercel.json
  next.config.ts
  package.json
```

### Runtime stack

| Piece | Choice |
| --- | --- |
| Next | `16.3.x` (same major as `/Users/username/graphai/package.json`) **without** `output: 'export'` |
| React | 19 |
| Tailwind | 4.3.x, tokens in `@theme` matching grok CSS |
| Clerk | `@clerk/nextjs` via `clerk init --framework next` |
| Sentry | `@sentry/nextjs` wizard, project `jobs2-graphai-eu` |
| BQ | `@google-cloud/bigquery` |
| Charts | lightweight SVG (grok-style bars) + optional `recharts` for the time-series only |
| Map | Leaflet choropleth, **`next/dynamic(..., { ssr: false })` only** (Leaflet needs `window`). Natural Earth 110m GeoJSON vendored in `public/geo/` with the NE license file. |
| Tests | `node --experimental-strip-types --test lib/*.test.ts` (or `tsx --test`). Do not use `node --test lib/*.test.ts` without a loader. |

---

## API / Interface Changes

All JSON. No cookies except Clerk `__session`. Same-origin Next app: **do not** set `Access-Control-Allow-Origin: https://jobs2.graphai.eu` on document or API routes (that blocks `*.vercel.app` preview e2e/pentest). If a CORS header is ever needed, echo the request Origin only when it is `https://jobs2.graphai.eu` or `https://*.vercel.app` for this project; never `*`.

### Entitlement-aware listing contract

Every jobs/country payload includes:

```ts
type Entitlement = {
  tier: "anonymous" | "trial" | "free" | "paid" | "operator"
  cap_per_country: number | null  // null = unlimited
  truncated: boolean
  trial_ends_at: string | null
  free_mode: boolean
}
```

### Routes

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | `{ ok, sha, bq: "prod"\|"dev" }` |
| `GET` | `/api/countries` | public | Per iso2: `n_total` (true harvest count, teaser for anonymous), `n_visible` (listing cap), `probed`. Cache-Control `public, s-maxage=300` for anonymous. |
| `GET` | `/api/countries/:iso2?availability=&specialties=` | public | Bar series + kinds using **true** counts. 404 if iso2 not `[A-Z]{2}`. |
| `GET` | `/api/countries/:iso2/series?from=&to=` | public | Daily `n_available`, `n_unavailable`, `n_total` + `kpi_unemployment`. Anonymous: last 90 days. |
| `GET` | `/api/jobs?country=&specialties=&certs=&availability=&cursor=&limit=` | public | **Listings** only. Server applies `public_rank <= cap`. `certs` AND. `limit` max 50. Cursor is `job_key`. |
| `GET` | `/api/jobs/cert-curve?country=&specialties=&certs=` | public | `{ points: [{ k, cert_id, n }] }`. Anonymous: `cap=1000` + empty-state. Signed-in: caller cap. |
| `GET` | `/api/jobs/:id` | public | Detail. 404 if outside listing cap. Full description only if paid/operator and not free-mode. |
| `GET` | `/api/profile` | Clerk | Profile + entitlement. |
| `PUT` | `/api/profile` | Clerk | `{ specialties: string[], free_mode?: boolean }`. Writes Clerk `publicMetadata` + BQ. First PUT sets `trial_started_at` if unset. |
| `DELETE` | `/api/profile` | Clerk | Deletes BQ `profiles` / `entitlements` / `payments` for that `clerk_user_id`. |
| `POST` | `/api/webhooks/clerk` | Clerk svix | `user.deleted` → same purge. |
| `POST` | `/api/billing/checkout` | Clerk | Create Revolut subscription/order; returns `{ url }`. No payment-link fallback. |
| `POST` | `/api/billing/revolut` | Revolut webhook | Raw body + signature. Maps cancel/expire → `lapsed`. |
| `GET` | `/api/certs?cluster=` | public | Catalog `cert_id` checkboxes for the combobox (not CH extras). |

### IDOR / cap rules (must be tested)

- Listing queries **always** filter `job_offers_country` with `public_rank <= cap` (or no rank filter when `cap` is null). There is no `job_public_sample` table.
- `GET /api/jobs/:id` uses the same predicate. Guessing `job_key` outside the cap → 404.
- **Country totals:** `/api/countries` and bar series **do** return exact `n_total` to anonymous (teaser). **Listings and cert-curve** stay capped. Choropleth uses log buckets so DE/NL/CZ/UK do not all look like “1000”.
- Full description: extra SELECT on `job_descriptions` only when `cap === null` and `free_mode === false`.

### `visible_jobs` SQL helper

```sql
-- public_rank is frozen at first insert (append-only). 1k prefix ⊂ 10k ⊂ full
-- for URLs that existed at backfill. cap NULL = unlimited
SELECT *
FROM apply_jobs_jobs2_prod.job_offers_country
WHERE country_iso2 = @cc
  AND (@cap IS NULL OR public_rank <= @cap)
```

---

## Data Model Changes

### Datasets

| Dataset | Location | Role |
| --- | --- | --- |
| `poetic-sentinel-402405.apply_jobs` | EU | Harvest SoT. **jobs2 is read-only** here. |
| `poetic-sentinel-402405.apply_jobs_jobs2_prod` | EU | Production jobs2 tables. |
| `poetic-sentinel-402405.apply_jobs_jobs2_dev` | EU | Dev copy. Same DDL. Scheduled sync from prod. |

Vercel env `BQ_DATASET=apply_jobs_jobs2_prod` (production) / `apply_jobs_jobs2_dev` (preview + `npm run dev`). `BQ_SOURCE_DATASET=apply_jobs` always.

### DDL — jobs2 (additive; does not ALTER `job_offers`)

```sql
CREATE SCHEMA IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod`
OPTIONS (location = "EU", description = "jobs2.graphai.eu production");

CREATE SCHEMA IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_dev`
OPTIONS (location = "EU", description = "jobs2.graphai.eu development");

-- raw_string → iso2; seed from live DISTINCT country + explicit maps
CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map` (
  raw_string STRING NOT NULL,
  country_iso2 STRING NOT NULL,     -- GB not UK; EL→GR; ZZ = unknown
  source STRING                     -- seed | tld | manual
)
CLUSTER BY raw_string;

-- Restricted full text. Web SA is dataViewer; handlers SELECT only if paid/operator.
CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_descriptions` (
  job_key STRING NOT NULL,
  description STRING
)
CLUSTER BY job_key;

-- Materialized country-normalized corpus (no day partition: ~150–250 MiB, MERGE-friendly)
CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` (
  job_key STRING NOT NULL,          -- TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm),1,18)), '+/', '-_')
  url STRING NOT NULL,
  url_norm STRING NOT NULL,
  company STRING,
  title STRING,
  job_location STRING,
  headquarters_location STRING,
  is_remote STRING,
  country_raw STRING,
  country_iso2 STRING NOT NULL,
  appeared_at STRING,
  appeared_at_ts TIMESTAMP,         -- parsed or NULL
  source STRING,
  description_excerpt STRING,       -- SUBSTR(description, 1, 1200)
  description_len INT64,
  specialties ARRAY<STRING>,
  public_rank INT64,                -- frozen at first insert; append-only
  availability STRING,              -- default 'available' until miss_streak >= 3
  ingested_at TIMESTAMP NOT NULL    -- stable; set once on insert
)
CLUSTER BY country_iso2, public_rank
OPTIONS (description = "jobs2 serving table; never SELECT apply_jobs.job_offers from the web app");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_certs` (
  job_url STRING NOT NULL,
  job_key STRING NOT NULL,
  country_iso2 STRING NOT NULL,
  cert_id STRING NOT NULL,
  certification_name STRING,
  provider STRING,
  certification_url STRING,
  match_kind STRING,                -- mentioned | skill_related | job_skill  (not CH extras)
  evidence STRING
)
CLUSTER BY country_iso2, cert_id;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_conferences` (
  job_url STRING NOT NULL,
  job_key STRING NOT NULL,
  conference_name STRING,
  organizer STRING,
  conference_url STRING,
  location STRING,
  start_date DATE,
  end_date DATE,
  relation STRING,
  topics STRING
)
CLUSTER BY job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_talks` (
  job_url STRING NOT NULL,
  job_key STRING NOT NULL,
  conf_id STRING,
  conference_name STRING,
  talk_id STRING,
  talk_title STRING,
  talk_description STRING,
  speakers STRING,
  talk_url STRING,
  talk_type STRING,
  score INT64
)
CLUSTER BY job_key;

-- ClickHouse import
CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.skill_certs_imported` (
  skill_id STRING,
  skill_name STRING,
  level STRING,                     -- beginner | advanced
  provider STRING,
  name STRING,
  uri STRING,
  source_url STRING,
  imported_at TIMESTAMP
)
CLUSTER BY skill_id;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_specialty_counts` (
  as_of DATE,
  country_iso2 STRING,
  specialty STRING,
  n_available INT64,
  n_unavailable INT64,
  n_total INT64
)
PARTITION BY as_of
CLUSTER BY country_iso2, specialty;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily` (
  d DATE,
  country_iso2 STRING,
  specialty STRING,                 -- '*' for all-specialty rollup
  n_available INT64,
  n_unavailable INT64,
  n_total INT64
)
PARTITION BY d
CLUSTER BY country_iso2, specialty;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_availability_checks` (
  checked_at TIMESTAMP,
  job_url STRING,
  job_key STRING,
  http_status INT64,
  found BOOL,                       -- listing + description still present
  evidence STRING,                  -- first 180 chars of matched haystack or reason
  worker STRING                     -- GCE instance name
)
PARTITION BY DATE(checked_at)
CLUSTER BY job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_availability_status` (
  job_key STRING,
  job_url STRING,
  status STRING,                    -- available (default) | probably_unavailable
  last_http_status INT64,
  last_checked_at TIMESTAMP,
  last_found_at TIMESTAMP,
  miss_streak INT64                 -- 0 at insert; >=3 flips status
)
CLUSTER BY status, job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.kpi_country_monthly` (
  year_month DATE,                  -- first of month
  country_iso2 STRING,
  unemployment_rate FLOAT64,        -- percent
  source STRING,                    -- eurostat | worldbank
  fetched_at TIMESTAMP
)
CLUSTER BY country_iso2;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.profiles` (
  clerk_user_id STRING NOT NULL,
  email STRING NOT NULL,
  email_canonical STRING NOT NULL,  -- googlemail→gmail
  specialties ARRAY<STRING>,
  free_mode BOOL,
  is_operator BOOL,
  trial_started_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
CLUSTER BY clerk_user_id;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.entitlements` (
  email_canonical STRING NOT NULL,
  clerk_user_id STRING,
  provider STRING,                  -- revolut | operator | trial
  status STRING,                    -- trial | paid | lapsed | operator
  revolut_customer_id STRING,
  revolut_subscription_id STRING,
  revolut_order_id STRING,
  amount_cents INT64,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  updated_at TIMESTAMP
)
CLUSTER BY email_canonical;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.payments` (
  at TIMESTAMP,
  email_canonical STRING,
  provider STRING,
  session_id STRING,                -- Revolut order id
  status STRING,
  amount_cents INT64,
  note STRING
)
PARTITION BY DATE(at)
CLUSTER BY email_canonical;

CREATE OR REPLACE VIEW `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_daily_latest` AS
SELECT * FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily`
WHERE specialty = '*'
QUALIFY ROW_NUMBER() OVER (PARTITION BY country_iso2 ORDER BY d DESC) = 1;
```

Repeat the same DDL for `apply_jobs_jobs2_dev`. There is **no** `job_public_sample` table.

### Source columns used from `apply_jobs` (verbatim)

From live `bq show` / loader SQL:

**`job_offers`:** `company, title, job_location, headquarters_location, is_remote, country, url, appeared_at, source, description, applied, applied_at, applied_status, applied_source`

**`job_skills`:** `url, title, company, country, skill, extracted_at`

**`job_certifications`:** `job_url, company, title, country, certification_name, provider, certification_url, match_kind, evidence, extracted_at`

**`certification_catalog`:** `cert_id, certification_name, provider, certification_url, mention_regex, skill_regex`

**`company_conferences`:** `company, job_url, job_title, conference_name, organizer, conference_url, location, start_date, end_date, relation, topics, extracted_at`

**`conference_catalog`:** `conf_id, conference_name, organizer, conference_url, location, start_date, end_date, mention_regex, topic_regex, host_company_regex, topics`

**`conference_talks`:** `conf_id, conference_name, talk_id, title, description, speakers, talk_url, talk_type, track, start_time, location, source, extracted_at`

**`job_conference_talks`:** `job_url, company, job_title, conf_id, conference_name, talk_id, talk_title, talk_description, speakers, talk_url, talk_type, score`

**`job_position_certs_conferences`:** nested `certifications[]` (`certification_name, provider, certification_url, match_kind`) and `conferences[]` (`conference_name, organizer, conference_url, location, start_date, end_date, relation`) plus `job_url, company, title, country, job_location`

Do **not** add columns to `apply_jobs.job_offers`. Country iso2 lives only on jobs2 tables.

### Materialize job (complete contract — `scripts/bq/materialize.sql`)

PR 3 lands the **full** SQL, not a sketch. Steps, in order:

**0. Snapshot (before any full rematerialize):** `scripts/bq/snapshot.sh` runs
`bq --location=EU cp --force PROJECT:apply_jobs_jobs2_prod.job_offers_country PROJECT:apply_jobs_jobs2_prod.job_offers_country_YYYYMMDD` (and `job_descriptions`, `job_offer_certs`). Rollback = point the app at a dated copy or `bq cp` back.

**1. Functions**

```sql
CREATE TEMP FUNCTION url_norm(u STRING) AS (
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(u, "")), r"[?#].*$", ""), r"/+$", ""))
);

-- Canonical job_key. Do not use a JS UDF or Python for the hourly job.
CREATE TEMP FUNCTION job_key(u STRING) AS (
  TRANSLATE(TO_BASE64(SUBSTR(SHA256(u), 1, 18)), '+/', '-_')
);

CREATE TEMP FUNCTION parse_appeared_at(s STRING) AS (
  -- Reed-style dd/mm/yyyy
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y', TRIM(s)),
    -- epoch-ms if all digits and length >= 12
    IF(
      REGEXP_CONTAINS(TRIM(s), r'^[0-9]{12,}$'),
      TIMESTAMP_MILLIS(SAFE_CAST(TRIM(s) AS INT64)),
      NULL
    )
  )
);
```

`job_key(url_norm)` **is** `TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')`. That is the only hourly path. `lib/job-key.ts` must match. Golden tests (also in `lib/job-key.test.ts`):

| `url_norm` | BQ `TO_BASE64(SUBSTR(SHA256(…),1,18))` | `job_key` |
| --- | --- | --- |
| `https://example.com/jobs/0` | `WW/lTzJcDv0RV1K2Ze1n3Vhh` | `WW_lTzJcDv0RV1K2Ze1n3Vhh` |
| `https://x.com/job?a=1` | `LBok6LHiGiQLMFWvExCnd+WZ` | `LBok6LHiGiQLMFWvExCnd-WZ` |

**2. `country_map` seed** (`scripts/bq/country_map_seed.sql`): seed **only** (a) identity rows for 2-letter codes in `CENTROIDS` / `lib/country.ts` (code → itself, including `GB` not `UK`, `GR` not `EL`), and (b) the explicit **name** table below. **Do not** `INSERT SELECT DISTINCT TRIM(country)` leftovers as `ZZ` or NULL — a map hit would disable TLD fallback (`Spain` → ZZ beating `acme.es` → ES). Unmapped raw values miss the map and take TLD then `ZZ` at materialize time. Dump live `SELECT country, COUNT(*) n FROM apply_jobs.job_offers GROUP BY 1 ORDER BY n DESC` into `scripts/bq/country_raw_counts.snapshot.sql` (or a comment) so PR 3 can grep coverage; do **not** hand-copy all 92 strings into this contract.

| raw_string (casefold) | iso2 |
| --- | --- |
| `uk`, `great britain`, `united kingdom`, `england` | `GB` |
| `el`, `greece` | `GR` |
| `germany`, `deutschland` | `DE` |
| `czechia`, `czech`, `czech republic` | `CZ` |
| `netherlands`, `holland` | `NL` |
| `usa`, `united states`, `united states of america` | `US` |
| `china` | `CN` |
| `korea, republic of`, `south korea` | `KR` |

Do **not** insert `''`, `unknown`, or `EU (other)` — those miss the map → TLD → else `ZZ`. After map miss: TLD from `url` via `TLD_COUNTRY` (`.co.uk` → `GB`). Else `ZZ`. Alert if `% ZZ > 8%`.

**3. Staging SELECT** from `apply_jobs.job_offers` (read-only) + `country_map` + specialty needles (copy of `SKILL_CATALOG.names` as a SQL array table `specialty_needles(id, needle)`). Specialties = distinct ids from `job_skills.skill` match **OR** `REGEXP_CONTAINS(LOWER(CONCAT(title, ' ', SUBSTR(description,1,4000))), needle)` because `job_skills` is sparse.

**4. MERGE `job_offers_country` on `url_norm`:**
- `WHEN NOT MATCHED THEN INSERT` with `ingested_at = CURRENT_TIMESTAMP()`, `availability = 'available'`, `public_rank = NULL` (assigned in step 5), excerpt + `job_descriptions`.
- `WHEN MATCHED THEN UPDATE` company/title/location/excerpt/specialties/`appeared_at_ts` — **do not** update `public_rank`, `ingested_at`, or `availability` (availability is owned by the worker).

**5. Assign `public_rank` append-only:**

```sql
-- Initial backfill only (table empty or public_rank all NULL):
-- public_rank = ROW_NUMBER() OVER (PARTITION BY country_iso2 ORDER BY FARM_FINGERPRINT(url_norm))

-- Incremental: existing ranks untouched.
-- New rows (public_rank IS NULL):
-- public_rank = country_max + ROW_NUMBER() OVER (
--   PARTITION BY country_iso2 ORDER BY FARM_FINGERPRINT(url_norm)
-- )
```

**6. MERGE certs/talks/conferences** on `(job_key, cert_id)` / `(job_key, conference_name)` / `(job_key, talk_id)` from `apply_jobs` source tables. `cert_id` comes from `certification_catalog` join on `certification_name` (or loader `cert_id` if added later). Do **not** insert ClickHouse extras into `job_offer_certs`.

**7. MERGE `job_descriptions`** on `job_key` with full `description` (scheduler SA only).

**8. Rebuild rollups** `country_specialty_counts` (`as_of = CURRENT_DATE()`) and `job_count_daily` (`specialty = '*'` plus per-cluster). View `country_daily_latest` picks the latest `d`.

**9. Assert (fails the scheduled query):**

```sql
SELECT
  (SELECT COUNT(*) FROM apply_jobs.job_offers) AS src,
  (SELECT COUNT(*) FROM apply_jobs_jobs2_prod.job_offers_country) AS serving
-- fail if ABS(serving-src)/src >= 0.01
```

Hourly Cloud Scheduler runs the incremental MERGE. Do not `PARTITION BY DATE(ingested_at)` on the whole serving table.

### Migration strategy

1. `bq mk --location=EU` both datasets.
2. Apply `scripts/bq/ddl.sql` + `country_map_seed.sql`.
3. Snapshot (no-op if empty) then full materialize. Assert serving `COUNT(*)` ≈ live `apply_jobs.job_offers` `COUNT(*)` (1%).
4. Schedule hourly incremental MERGE.
5. Import ClickHouse extras into `skill_certs_imported` (non-blocking).
6. Seed operator `profiles` (`is_operator=TRUE`) for the two allowlist emails only — in **prod**. Dev: seed Playwright users, never copy prod PII.
7. Dev sync of **non-PII** serving tables (below).

Rollback: `bq cp` dated snapshot back, or pause Vercel. Harvest tables are untouched. `scripts/bq/rebalance_public_rank.sql` is manual/out of v1.

---

## Entitlement algorithm

```ts
// lib/operators.ts
export const OPERATOR_EMAILS = new Set([
  "martibayoalemany@gmail.com",
  "martibayoalemany@googlemail.com",
])

export function canonicalEmail(raw: string): string {
  const e = String(raw || "").trim().toLowerCase()
  const at = e.indexOf("@")
  if (at < 1) return e
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  if (domain === "googlemail.com") return `${local}@gmail.com`
  return e
}

export function isOperatorEmail(raw: string): boolean {
  const e = canonicalEmail(raw)
  if (OPERATOR_EMAILS.has(e) || OPERATOR_EMAILS.has(raw.trim().toLowerCase())) return true
  // googlemail alias of an allowlisted gmail
  const [local, domain] = e.split("@")
  if (domain === "gmail.com" && OPERATOR_EMAILS.has(`${local}@googlemail.com`)) return true
  return false
}
```

```ts
// lib/entitlement.ts
export const CAP_ANON = 1_000
export const CAP_FREE = 10_000
export const SUB_PRICE_CENTS = 500
export const TRIAL_DAYS = 7

export type Tier = "anonymous" | "trial" | "free" | "paid" | "operator"

export function capFor(input: {
  email?: string
  isOperatorRow?: boolean
  freeMode?: boolean
  entitlementStatus?: string | null  // trial | paid | lapsed | operator
  trialStartedAt?: Date | null
  now?: Date
}): { tier: Tier; cap: number | null; trialEndsAt: Date | null } {
  const now = input.now ?? new Date()
  if (isOperatorEmail(input.email || "") || input.isOperatorRow) {
    if (input.freeMode) return { tier: "operator", cap: CAP_FREE, trialEndsAt: null }
    return { tier: "operator", cap: null, trialEndsAt: null }
  }
  if (!input.email) return { tier: "anonymous", cap: CAP_ANON, trialEndsAt: null }

  const trialEnd = input.trialStartedAt
    ? new Date(input.trialStartedAt.getTime() + TRIAL_DAYS * 86400_000)
    : null
  const trialActive = trialEnd && now < trialEnd && input.entitlementStatus !== "paid"

  if (input.entitlementStatus === "paid") {
    if (input.freeMode) return { tier: "paid", cap: CAP_FREE, trialEndsAt: trialEnd }
    return { tier: "paid", cap: null, trialEndsAt: trialEnd }
  }
  if (input.entitlementStatus === "lapsed") {
    return { tier: "free", cap: CAP_FREE, trialEndsAt: trialEnd }
  }
  if (trialActive) return { tier: "trial", cap: CAP_FREE, trialEndsAt: trialEnd }
  return { tier: "free", cap: CAP_FREE, trialEndsAt: trialEnd }
}
```

**First login:** `PUT /api/profile` writes Clerk `publicMetadata.specialties` and INSERTs `profiles` with `trial_started_at = CURRENT_TIMESTAMP()` if unset, `free_mode = FALSE`, `is_operator = isOperatorEmail(email)`. UPSERT `entitlements` `status = operator | trial`. Plus-addresses are never operators.

**Paid path:** Revolut webhook `ORDER_COMPLETED` / `ORDER_AUTHORISED` → `payments` + `status = paid`. `SUBSCRIPTION_CANCELLED` / `SUBSCRIPTION_EXPIRED` (and any `event` containing `CANCEL`/`EXPIRED`) → `status = lapsed` (do not ignore the way jobs `handleRevolutWebhook` ignores non-ORDER events). No `REVOLUT_ORDER_ID` payment-link fallback.

**Free-mode:** `profiles.free_mode` only; does not cancel Revolut.

**Visibility:** `cap === null` → no `public_rank` filter on **listings**. Else `public_rank <= cap`. Country `n_total` is not capped.

---

## ClickHouse → BigQuery import plan

ClickHouse (from `jobs-graphai-eu/lib/clickhouse.js` + `lib/skill-certs.js`):

- Host `b23f71a4si.europe-west2.gcp.clickhouse.cloud:8443`
- Database from `CLICKHOUSE_DATABASE` (env; often `default` with `graphai.*` tables)
- Table `graphai.jobs_skill_certs` ReplacingMergeTree `(skill_id, level, uri)`:

```
at DateTime64(3)
skill_id String
skill_name String
level LowCardinality(String)   -- beginner | advanced
provider LowCardinality(String)
name String
uri String
source_url String
```

Crawler: `jobs-graphai-eu/scripts/spot-worker/crawl-skill-certs.mjs` (Google Skills, edx.org `/learn|certificates|course|…`, coursera.org `/learn|professional-certificates|specializations/`). Static fallback courses also live in `public/studio.json`.

**jobs2 does not query ClickHouse at request time** (Mac sessions have seen HTTP 403 on KEY/SECRET; Vercel should not take that dependency). Nightly import:

`scripts/bq/import_clickhouse.py`

1. `SELECT skill_id, skill_name, level, provider, name, uri, source_url, toString(at) AS at FROM graphai.jobs_skill_certs FINAL FORMAT JSONEachRow`
2. Load replace into `skill_certs_imported`.
3. Crawler `skill_id`s in `crawl-skill-certs.mjs` **are** the 18 `SKILL_CATALOG` ids (`python`, `javascript`, …). Map 1:1. Do **not** mint `cert_id = 'ch:'||farm_fingerprint(uri)` into `job_offer_certs` — those ids never join catalog AND filters.
4. Job detail “Learn” list: extras by `skill_id` ∩ job `specialties`. Checkboxes stay `certification_catalog` only.

Live CH from the review Mac: SSL `UNEXPECTED_EOF_WHILE_READING`. Row counts **unverified**. **Do not block launch on CH.**

Schedule: Cloud Scheduler `0 3 * * *` Europe/Berlin. Credentials from env, never committed.

If CH is unreachable, ship catalog certs (49) + BQ `job_certifications` (re-query count; was 151,349 at revision). edx/coursera links degrade to `data/skill-courses.seed.json` (public URLs from `jobs-graphai-eu/public/studio.json`).

---

## Dev/prod BQ sync

| | Production | Development |
| --- | --- | --- |
| Vercel env | `BQ_DATASET=apply_jobs_jobs2_prod`, `NODE_ENV=production` | Preview + local: `BQ_DATASET=apply_jobs_jobs2_dev` |
| Harvest | `apply_jobs` (shared SoT) | Same `apply_jobs` **or** a copied `job_offers` subset — **decision: copy serving tables, not harvest.** Harvest stays one EU dataset. |
| jobs2 tables | prod dataset | `bq cp` / scheduled query `CREATE OR REPLACE TABLE dev.X COPY prod.X` |

**Sync job** `scripts/bq/sync_dev.sh` (Cloud Scheduler `15 4 * * *`):

```bash
PROJECT=poetic-sentinel-402405
for t in job_offers_country job_descriptions job_offer_certs job_offer_conferences \
         job_offer_talks skill_certs_imported country_map country_specialty_counts \
         job_count_daily job_availability_status kpi_country_monthly
do
  bq --location=EU cp --force \
    ${PROJECT}:apply_jobs_jobs2_prod.${t} \
    ${PROJECT}:apply_jobs_jobs2_dev.${t}
done
```

**Do not copy prod PII.** Never `bq cp` `profiles`, `entitlements`, `payments`, or `job_availability_checks`. Dev `profiles` is **seed-only** (Playwright QA user + empty operator row with a **dev** `clerk_user_id`). `martibayoalemany+jobs2-qa@graphai.eu` will not match a copied operator row anyway.

Also copy `country_map`, `job_descriptions`, `job_offers_country` (serving).

Local `npm run dev` uses ADC or `GOOGLE_APPLICATION_CREDENTIALS`. Never ship SA JSON to git.

**Service accounts (mandatory split):**

| SA | Role |
| --- | --- |
| `jobs2-web@poetic-sentinel-402405.iam.gserviceaccount.com` | `bigquery.jobUser` on project; `dataViewer` on `apply_jobs` (unused at request time — prefer **no** `apply_jobs` grant) and on jobs2 **serving** tables including `job_descriptions`; `dataEditor` **only** on `profiles`, `entitlements`, `payments`. Cannot DROP serving tables. |
| `jobs2-web-dev@…` | Same on `apply_jobs_jobs2_dev` only. **Mandatory** separate Vercel Preview key (`BQ_SA_JSON_DEV`). |
| `jobs2-scheduler@…` | `dataViewer` on `apply_jobs`; `dataEditor` on all `apply_jobs_jobs2_*` tables; runs materialize, KPI, CH import, snapshots. |

Production Vercel uses `jobs2-web` JSON only. Preview never receives the prod key.

---

## Availability worker (Playwright on apply-spot)

Reuse `/Users/username/deepline/data/karlsruhe-public-co-job-apps/gcp_spot/{startup.sh,watchdog.sh,hb_tick.sh,create_spot_vms.sh}`:

- Instance `apply-spot-jobs2-1` (name prefix still `apply-spot-`, counts toward the **200 VM / €200** cap in `lib/gcp-spot.js`).
- `/opt/apply/HEARTBEAT` unix epoch; watchdog `MAX_AGE_SEC=2700`; `hb_tick.sh` while the worker process lives.
- SSH: `gcloud compute ssh --tunnel-through-iap --ssh-key-file ~/.ssh/apply_spot`.
- Workdir `/opt/apply`; writes as `username` (directory owner on existing fleet).

`scripts/workers/availability_check.py`:

1. Let `n_urls = COUNT(*)` from `job_offers_country`. `shard_mod = GREATEST(23, CAST(CEIL(n_urls / 30000) AS INT64))`. Pull
   `MOD(ABS(FARM_FINGERPRINT(url_norm)), shard_mod) = MOD(EXTRACT(DAYOFYEAR FROM CURRENT_DATE()), shard_mod)`
   UNION rows with `appeared_at_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR)`
   UNION rows with `appeared_at_ts IS NULL AND ingested_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR)`.
   Cap **30,000** URLs/VM/day. At ~571k this is a 23-day cycle (~25k/day); at 1M URLs, 34 days.
2. Playwright Chromium, `User-Agent: GraphaiJobs2/1.0`. Timeout 20s. Respect `robots.txt`; **skip → leave `availability` unchanged** (do not write `unknown`).
3. `found = True` iff HTTP 200–399 **and** page text contains a 12-char slice of stored `title` **or** `description_excerpt` (casefold). Soft-404 → `found=False`. HTTP 401/403 → skip (status unchanged), not a miss.
4. Stream `job_availability_checks`. MERGE status: `miss_streak >= 3` → `probably_unavailable`; else keep **`available`** (insert default). New jobs start `available` so the unprobed corpus is not hidden.
5. Recompute `job_count_daily` for `CURRENT_DATE()` and set `job_offers_country.availability` from the status table.

**Still show unavailable jobs** with a badge. UI filter default = `all` until the selected country has ≥1 probe; then `available`.

GCP cost: one `e2-standard-2` Spot × ~6 h/day × €0.041/h ≈ **€7.4/month**. Tag `jobs2`. Alert if jobs2 compute > €20/month. Do not steal the apply-fleet €200 cap.

---

## Economic KPIs

**Primary — Eurostat Statistics API** (JSON-stat 2.0, no key):

```
GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m
    ?format=JSON&lang=EN&s_adj=SA&sex=T&age=TOTAL&unit=PC_ACT
```

Dataset `une_rt_m`: monthly unemployment rate, seasonally adjusted, % of active population. `geo` uses ISO-2 (`DE`, `NL`, `CZ`, `EL` for Greece — `country_map` already maps `EL`→`GR` and Eurostat `EL` should be stored as `GR` on ingest). `UK` may be absent post-Brexit — leave KPI null for `GB` rather than fabricating.

**Fallback — World Bank** (no key):

```
GET https://api.worldbank.org/v2/country/{iso2}/indicator/SL.UEM.TOTL.ZS?format=json&per_page=60
```

Annual total unemployment. Use when Eurostat has no `geo` for that iso2 (US, SG, …).

`scripts/bq/ingest_kpi.py` monthly (1st, 06:00 UTC). UI: right axis “Unemployment %” on the country jobs curve; source badge `Eurostat une_rt_m` / `World Bank SL.UEM.TOTL.ZS`.

Not in v1: Destatis, OECD SDMX, ECB SDW (documented as future overlays).

---

## Playwright QA matrix (except billing checkout)

Config mirrors `jobs-graphai-eu/playwright.config.mjs`: `User-Agent: GraphaiJobs2QA/1.0`, JSON reporter `e2e/last-report.json`, HTML report, trace on failure. `baseURL` = `PLAYWRIGHT_BASE_URL` or `http://127.0.0.1:3000`.

QA Clerk user: `martibayoalemany+jobs2-qa@graphai.eu` in gitignored `e2e/.env` — **not** the operator gmail (so we can assert the 10k cap). Operator tests use a mocked `JOBS2_OPERATOR_EMAIL` override only on localhost.

| Spec | Coverage |
| --- | --- |
| `e2e/public.spec.ts` | `/` 200, wordmark, nav, theme-color, tabs, Plus Jakarta, `n_visible` listings ≤1000, `n_total` present on `/api/countries`, imprint footer, robots.txt, `security.txt` |
| `e2e/map.spec.ts` | Country select DE/CZ/NL, bar uses `n_total` (not 1000), log-bucket choropleth. **KPI legend / availability default: `test.skip` until PRs 11–12** (or this spec depends on those PRs). |
| `e2e/certs.spec.ts` | Combobox python, check two **catalog** ids (`aws-saa`, `az-204`), slider `aria-valuenow` = **k**, `aria-valuetext` contains job count, empty-state on anonymous AND=0, uncheck resets |
| `e2e/onboarding.spec.ts` | Map reachable without specialties; Jobs/List/Settings redirect to `/onboarding` until PUT profile. **A user whose session JWT already has `specialties` is not redirected** (session-token template works). |
| `e2e/entitlement.spec.ts` | Anonymous 404 on a paid-only `job_key`; free user `truncated: true` at 10k; operator (mocked) `cap: null` |
| `e2e/job-detail.spec.ts` | Public sample job shows certs + conferences blocks (or explicit empty state) |
| `e2e/settings.spec.ts` | Free-mode via **PUT** `/api/profile`; subsequent listing cap 10k for a paid mock |
| `e2e/auth.spec.ts` | Sign-in/up pages mount Clerk; session cookie present after login |
| `e2e/security.spec.ts` | Port of `jobs-graphai-eu/e2e/security.spec.js`: HSTS, no `ACAO: *`, gated APIs 401, no open redirect on `next=` |
| `e2e/a11y.spec.ts` | tablist roles, slider `aria-orientation="vertical"`, combobox labelling |

**Out of suite (req 12):** Revolut hosted checkout, card entry, 3DS.

**In unit tests:** `lib/revolut.test.ts` copied from `lib/pay-revolut-webhook.test.js` (fail-closed secret, HMAC, replay >5 min). `lib/job-key.test.ts` golden vectors (`https://example.com/jobs/0` → `WW_lTzJcDv0RV1K2Ze1n3Vhh`; `https://x.com/job?a=1` → `LBok6LHiGiQLMFWvExCnd-WZ`).

`package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "node --experimental-strip-types --test lib/*.test.ts",
    "test:e2e": "playwright test",
    "test:pentest": "node scripts/pentest/run.mjs",
    "test:e2e:issues": "node e2e/report-github.mjs"
  }
}
```

GitHub Actions `.github/workflows/ci.yml`: lint, `tsc`, unit, e2e against `npm run dev` (or Vercel preview URL when `VERCEL_TOKEN` present). Skip billing. On e2e failure, `e2e/report-github.mjs` runs `gh issue create --label qa --title "e2e: …"` deduped by title.

---

## Pentest script inventory

Authorized **defensive** testing of `jobs2.graphai.eu` / preview only. No payloads that exploit; no scans of ATS hosts; no sqlmap/nuclei-templates that include exploit modules.

`scripts/pentest/` (Node, Playwright `request` + `fetch`):

| Script | Checks |
| --- | --- |
| `headers.mjs` | HSTS `max-age`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP `frame-ancestors 'self'`, CORP `same-origin`, ACAO not `*` |
| `authz.mjs` | Unauthenticated `PUT /api/profile` 401; `POST /api/billing/checkout` 401; webhook without signature 401 |
| `idor.mjs` | Anonymous `GET /api/jobs/{paid_only_id}` 404; cannot list another user’s profile |
| `injection.mjs` | `country=DE'%20OR%201=1`, `certs[]` overflow, oversized JSON — expect 400, never 500 with SQL text |
| `ratelimit.mjs` | 60 req/min/IP on `/api/jobs` returns 429 after threshold |
| `redirect.mjs` | `next=//evil`, `next=https://evil` rejected (port `isSafeNext` from `clerk-auth.js`) |
| `run.mjs` | Orchestrator; writes `scripts/pentest/last-report.json`; non-zero if any FAIL |

`npm run test:pentest` hits `PENTEST_BASE_URL`, **default = Vercel preview URL** (never production after launch unless explicitly set). Failures open GitHub issues with label `pentest`. Repeatable in CI nightly against preview.

---

## Security & Privacy Considerations

| Threat | Sev | Mitigation |
| --- | --- | --- |
| IDOR on job URLs / descriptions | High | Visibility predicate on every read; excerpt-only for non-paid; no `applied_*` fields |
| Entitlement bypass via client `tier` | High | Server `capFor()` only; operator allowlist hardcoded + `profiles.is_operator` |
| Revolut webhook forgery | High | `revolutSignatureOk` fail-closed; raw body; 5-minute timestamp window (`pay.js`) |
| Clerk key reuse across products | High | **New** Clerk application; new `CLERK_SECRET_KEY`; production FAPI host dedicated (see DNS) |
| BQ scan / cost DoS | High | No raw `job_offers` access from Vercel SA; clustered serving tables; rate limit; anonymous ISR |
| Secret leakage in design/repo | High | Env names only; `.env*` gitignored; Vercel encrypted env |
| Open redirect after Clerk | Med | `isSafeNext` same-origin path only |
| PII in BQ | Med | Email + Clerk id in `profiles`; EU dataset; no CV uploads in jobs2 |
| Availability worker as crawler abuse | Med | UA identified, robots.txt, 30k URL/day cap, IAP SSH only |
| Empty studio if availability defaults wrong | High | Insert `available`; filter default `all` until probed |
| Harvest still growing during review | High | Re-query; 1% assert; never freeze row counts |
| `appeared_at` polymorphism | Med | PARSE dd/mm/yyyy OR epoch-ms; else `ingested_at` |
| Web SA blast radius | High | dataEditor only on PII tables; scheduler SA for DDL |
| Preview ACAO blocking e2e | Med | No blocking ACAO; pentest default preview |
| XSS via job description | Med | React text nodes; never `dangerouslySetInnerHTML` on harvest HTML |

Headers: copy jobs HSTS/CSP/CORP (HSTS 63072000, nosniff, DENY, CSP `frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests`). **Do not** copy jobs `Access-Control-Allow-Origin: https://jobs.graphai.eu`.

`/.well-known/security.txt`: `Contact: mailto:hello@graphai.eu`.

Rate limit (v1, **PR 14**): **Vercel Firewall** 60 req/min/IP on `/api/jobs*`, 10 req/min on `/api/billing/checkout`. Upstash is optional later, not required for pentest 429.

PII: `DELETE /api/profile` + Clerk `user.deleted`. Retention: entitlements kept while `paid`; purge payments older than 24 months in a later job. DPA: Graphai OÜ / EU BQ; link graphai.eu privacy.

---

## Observability

- **Sentry:** org `graphai-ou`, region `de.sentry.io`, new project `jobs2-graphai-eu`. `@sentry/nextjs` with `tracesSampleRate: 0.1` prod / `1.0` preview. `SENTRY_DSN` server, `NEXT_PUBLIC_SENTRY_DSN` browser (public DSN is not a secret in the Sentry model, but still env-injected, never hardcoded). `release = process.env.VERCEL_GIT_COMMIT_SHA`. Optional tunnel route `app/monitoring/route.ts` to avoid ad-blockers.
- **Source maps:** `sentry-cli sourcemaps upload` in `next.config.ts` `withSentryConfig`.
- **Logs:** Vercel runtime logs; BQ job failures → Sentry `captureException`.
- **QA correlate:** port `e2e/sentry-correlate.mjs` (`SENTRY_ORG=graphai-ou`, `SENTRY_REGION=de.sentry.io`) against `e2e/last-report.json`.
- **Alerts:** Sentry issue spike; Cloud Monitoring on scheduled query failure; heartbeat age on the availability VM (existing watchdog already shuts down — also emit a Sentry message when miss_streak rebuild is skipped).
- **Health:** `GET /api/health` used by Vercel and by pentest.

---

## Rollout Plan

Align with the PR sequence (do not run Clerk/Sentry wizards in the scaffold PR):

1. **PR 1:** GitHub repo + `create-next-app@16` + grok chrome. No Clerk, no Sentry wizard yet.
2. Create Clerk **application** “jobs2-graphai-eu” (separate from mail / money-briefing-001) when landing **PR 8** (`clerk init --framework next`). Dev instance first. **Session token template** `{ "specialties": "{{user.public_metadata.specialties}}" }` on the **dev** instance; repeat on the **production** instance at upgrade. Do **not** attach `clerk.graphai.eu`. Do **not** use `currentUser()` in `proxy.ts`.
3. **PR 13:** `npx @sentry/wizard@latest -i nextjs` → project `jobs2-graphai-eu`.
4. Revolut plan `Graphai Jobs2` 500 cents with **PR 10**; webhook URL `/api/billing/revolut`.
5. **PR 3:** `bq mk`; DDL; `country_map` seed; first materialize; assert vs live `COUNT(*)`.
6. Vercel project `jobs2-graphai-eu`, team `team_2MzmUHEuxjEOmy13tfYnSTle`, fra1, env split Production vs Preview (**mandatory** `BQ_SA_JSON` vs `BQ_SA_JSON_DEV`).
7. IONOS DNS: create Vercel project + add `jobs2.graphai.eu` **first**, copy the exact CNAME from the Vercel domain UI, then create the IONOS record. Promote Clerk to production after HTTPS (and copy the session-token template to the production instance).
8. Playwright + pentest against **preview**; Firewall rate-limit PR before pentest 429 asserts.
9. Email operator.
10. Feature flag `JOBS2_PUBLIC=1`.

This is **weeks**, not a weekend: 19 PRs, BQ + Clerk + Revolut + Spot worker + pentest, one operator.

**Rollback:** `vercel rollback` / previous deployment; DNS unchanged. Data rollback = point `BQ_DATASET` at a dated snapshot copy. Revolut plan can stay; entitlements remain in BQ.

---

## Vercel + IONOS DNS

### Vercel

- Team: `team_2MzmUHEuxjEOmy13tfYnSTle` (dashboard `https://vercel.com/martibayoalemany-9387s-projects`).
- New project name: `jobs2-graphai-eu`.
- Git: `martibayoalemany9/jobs2-graphai-eu`, production branch `main`.
- Root directory: repo root. Install `pnpm` or `npm` (match lockfile; prefer **npm** to reduce landing-site `pnpm` surprises unless the implementer standardizes).
- Node 22.x.
- Regions: function region **fra1** (grok already serves from fra1).
- Fluid Compute: on. `maxDuration` 15s for most Route Handlers; 25s for cert-curve if needed.
- Env (names only): `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_AUTHORIZED_PARTIES`, `REVOLUT_API_SECRET`, `REVOLUT_API_PUBLIC_KEY`, `REVOLUT_WEBHOOK_SECRET`, `REVOLUT_ENV=live`, `REVOLUT_API_VERSION=2026-04-20`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=graphai-ou`, `SENTRY_PROJECT=jobs2-graphai-eu`, `BQ_PROJECT=poetic-sentinel-402405`, `BQ_DATASET`, `BQ_SOURCE_DATASET=apply_jobs`, `BQ_LOCATION=EU`, `BQ_SA_JSON` (prod web SA), `BQ_SA_JSON_DEV` (preview/dev web SA — **required**, not optional), `JOBS2_PUBLIC`.

Do **not** copy jobs or mail Clerk/Revolut secrets into this project. Revolut **merchant** account can be the same Graphai business account; the **plan** and **webhook** are new. Clerk application is new.

GitHub-linked production deploys with author `martibayoalemany9@gmail.com` have been `readyState BLOCKED` on the landing project (SITES.md). If that recurs, deploy with `vercel --prod --yes` from a clean tree as documented for `graphai`.

### IONOS (zone `graphai.eu`)

Registrar DNS is IONOS (`ns*.ui-dns.*`) per `/Users/username/graphai/SITES.md`. Apex is an A record; **jobs2 is a subdomain — CNAME**. Live siblings do **not** use generic `cname.vercel-dns.com`:

| Existing host | Live CNAME (dig 2026-09-27) |
| --- | --- |
| `grok.graphai.eu` | `4b60e832bf51d69d.vercel-dns-013.com` |
| `jobs.graphai.eu` | `77fdd00a9e856e7f.vercel-dns-017.com` |

**Procedure (do not invert):**

1. Create the Vercel project `jobs2-graphai-eu` and add domain `jobs2.graphai.eu` **first**.
2. Copy the CNAME **target from the Vercel domain UI**. Expect `*.vercel-dns-0xx.com` (same pattern as grok/jobs). **Do not invent a jobs2 hash** before the project exists.
3. In IONOS, `jobs2` CNAME → **that hostname**, TTL 300 then 3600 after verify.
4. `cname.vercel-dns.com` is a **fallback only** if the Vercel UI still shows that generic host.

| Host | Type | Value | TTL |
| --- | --- | --- | --- |
| `jobs2` | CNAME | *(paste exact Vercel UI target; fallback `cname.vercel-dns.com` only if UI shows it)* | 300 → 3600 after verify |

Clerk production (after upgrade):

| Host | Type | Value |
| --- | --- | --- |
| `clerk.jobs2` | CNAME | (Clerk-provided `frontend-api` target) |

Do **not** reuse `clerk.graphai.eu` (owned by `money-briefing-001`). Do **not** put MX on `jobs2`.

Vercel domain: add `jobs2.graphai.eu`, verify TXT if asked (`_vercel.jobs2` or zone `_vercel`).

### Operator email (post-implement)

To: `martibayoalemany@gmail.com`  
Subject: `jobs2.graphai.eu production URL + IONOS DNS`

Body must include:

- Production URL: `https://jobs2.graphai.eu` and the `*.vercel.app` alias.
- IONOS: create Vercel project + domain first, then `jobs2` CNAME to the **exact target shown in the Vercel domain UI** (expect `*.vercel-dns-0xx.com`, like grok `4b60e832bf51d69d.vercel-dns-013.com` and jobs `77fdd00a9e856e7f.vercel-dns-017.com`). Do not invent a jobs2 hash. Fallback `cname.vercel-dns.com` only if the UI still shows it.
- Clerk production CNAME if not yet done.
- Sentry project `jobs2-graphai-eu`.
- Confirmation that billing E2E was **not** QA’d; webhook unit tests were.

---

## Cost / scaling report (sell 1 million users)

**One formula** (use this; do not mix “paid-equivalent” with all origin calls):

```
sessions      = MAU × 10
api_calls     = sessions × 8                    -- 80 × MAU
anon_share    = 0.80  → CDN/ISR (no BQ)
signed_share  = 0.20  → origin APIs
paid_share    = 0.05  → BQ listing/cert-curve
origin_apis   = MAU × 80 × 0.20               -- 16 × MAU
bq_queries    = MAU × 80 × 0.05               -- 4 × MAU
bq_bytes      = bq_queries × 5 MiB
bq_eur        = bq_bytes / 2^40 × 5.80        -- on-demand ~$6.25/TiB ≈ €5.80/TiB
```

Vercel Fluid (fra1): Active CPU **$0.184/h**, memory **$0.0152/GB-h**, invocations **$0.60/million** ([Vercel Fluid pricing](https://vercel.com/docs/functions/usage-and-pricing), Jun 2026). Pro seat ~€20. Spot worker €7–15. Sentry ~€26.

**Clerk** ([clerk.com/pricing](https://clerk.com/pricing), 2026-02-05 plans): bills **MRU** (return 24h after signup), not MAU. Hobby/Pro include **50,000 MRU/app**. Pro **$25/mo** ($20 annual). Overage: 50k–100k **$0.02**/MRU; 100k–1M **$0.018**; 1M–10M **$0.015**. Passkeys/MFA need Pro. Anonymous Map users are **not** Clerk MRU.

Clerk at product MAU (assuming signed-in 20% all retain = MRU):

| Product MAU | Signed-in MRU | Clerk plan | USD/mo |
| --- | --- | --- | --- |
| 1k | 200 | Hobby or Pro | $0 or **$25** (Pro for passkeys) |
| 100k | 20k | Pro | **$25** (inside 50k) |
| 1M | 200k | Pro | $25 + 50k×$0.02 + 100k×$0.018 = **$2,825** ≈ €2,600 |

(If 1M **MRU** — 100% signed-in retained — Clerk = $25 + $1,000 + 900k×$0.018 = **$17,225**. Use 20% signed-in unless the mix changes.)

### Data size

Harvest is moving (~241 MiB / 571k rows at revision). 1M unique URLs ≈ ~400–500 MiB. Serving excerpt table smaller. Storage **< €2/month**.

### Monthly EUR (v1 caching: ISR 5 min anonymous countries; signed-in still BQ)

| MAU | origin APIs | BQ queries | BQ TiB | BQ € | Vercel (invoc+CPU est.) | Clerk+Sentry € | Spot € | **Total €** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1k** | 16k | 4k | ~0.02 | <1 | ~25 (Pro floor) | ~50 | 10 | **~€85** |
| **100k** | 1.6M | 400k | ~1.8 | ~10 | ~40–80 | ~50 | 15 | **~€120–160** |
| **1M** | 16M | 4M | ~18 | ~105 | ~60–150 (16M invoc ≈ $10 + CPU) | ~2,630 | 15 | **~€2.9k** |

KV/GCS (1M playbook) drops BQ toward ~€10 and is a **gated milestone**, not v1. Do **not** quote 200 TiB / €1,160 / 400M invocations — those mixed signed-in and anonymous and over-counted origin.

### 1M-user playbook (before marketing that scale)

1. Stop request-path BQ for anonymous: hourly GCS/Blob `countries.json`, `series/{iso2}.json`, `sample/{iso2}.json`.
2. KV cache cert-curve keys `sha256(iso2+specialties+certs)` 60s for signed-in.
3. Optional EU slot reservation if paid AND queries stay on BQ.
4. Vercel Firewall already on; watch Fast Data Transfer. GeoJSON `max-age=86400`.
5. Budget Clerk Pro + MRU overage (~€2.6k at 200k MRU).
6. **Do not** run 200 apply-spot VMs for jobs2. Tag `jobs2`, alert €20/month. Apply fleet keeps the €200 cap.
7. SEO `/c/{iso2}` ISR pages (v1.1).

**Vercel “instances”:** Fluid Compute — no pinned VM fleet.

---

## Alternatives Considered

1. **Extend `jobs-graphai-eu` static site** with new `/intelligence` pages and ClickHouse.  
   *Rejected:* jobs studio is gated beta, ClickHouse catalog is companies not the moving BQ harvest, no Next Clerk/Sentry SDK, vercel.json `framework: null`. User asked for a sibling product.

2. **Serve jobs2 directly from `apply_jobs.job_offers` with parameterized queries.**  
   *Rejected:* full-table scans of a moving ~200+ MiB table, messy `country`, no public_rank, easy to blow BQ budget, applied flags leak.

3. **Stripe-first subscriptions.**  
   *Rejected:* user requires Revolut; Stripe exists only as `pay.js` fallback and must not be primary.

4. **OR matching on certifications.**  
   *Rejected:* two popular certs (AWS + Azure) would collapse the slider to almost the full country count; AND matches “you hold these”.

5. **Eurostat + Destatis + OECD + ECB all in v1.**  
   *Rejected:* one primary + one fallback is operable; Destatis is DE-only; OECD SDMX is heavier. Overlay slots can add series later without UI redesign.

6. **Full daily Playwright of every harvest URL.**  
   *Rejected:* ~5–10s each → thousands of VM-hours, blows the €200 cap. Rotating modulus (`CEIL(n/30000)`) is the mitigation.

---

## Risks

| Risk | Sev | Mitigation |
| --- | --- | --- |
| `job_offers.country` quality (`UK` vs `GB`, 11k empty, 92 strings) | High | Parser + TLD fallback + `ZZ` bucket; monitor `% ZZ` (alert if >8%) |
| `job_skills` only 12k URLs | High | Title/description needle extract during materialize |
| Cert associations over-broad (`\bdevops\b` on AWS DevOps Pro — known loader issue) | Med | AND filter + `match_kind=mentioned` default in UI with a “include skill-related” toggle later (v1 = all match_kinds) |
| Clerk production blocked on shared FAPI | High | Separate Clerk app + `clerk.jobs2.graphai.eu` |
| Vercel Git deploys BLOCKED for `martibayoalemany9@gmail.com` | Med | CLI `vercel --prod --yes` fallback (SITES.md) |
| Revolut trial phase API incompatibility | Low | App-side trial is v1 primary; no P7D phase |
| Availability false `probably_unavailable` on JS-heavy ATS | Med | 3-miss streak; 401/403 leave status unchanged |
| Clerk 1M MRU bill | High | Price from clerk.com/pricing; 20% signed-in mix |
| BQ cost surprise | High | Serving tables only; quotas; scheduled query budget |
| Operator email hardcoded | Low | Plus BQ `is_operator`; document that plus-addresses are **not** auto-operator |
| Harvest mix shifting (CZ/NL growing; DE no longer ~63%) | Med | Show true `n_total`; include CZ in country narrative |
| Pentest accidentally hitting third parties | High | Scripts allowlist `jobs2.graphai.eu` / `*.vercel.app`; no follow of job `url` |
| Frozen `public_rank` staleness | Med | Anonymous 1k is the first-insert prefix; new harvest does not enter it until manual `rebalance_public_rank.sql` (out of v1). Operators should expect a stable teaser, not a live top-1k. |
| `job_key` standard vs url-base64 split-brain | High | Hourly SQL is only `TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm),1,18)), '+/', '-_')`; TS must match; golden tests include `+` and `/`. |
| Clerk session JWT missing specialties | High | Session token template on **dev and prod** instances; `proxy.ts` never `currentUser()` |

---

## Open Questions

Locked in this revision (not questions): availability insert default `available`; anonymous Map `n_total` teaser + log buckets; cert-curve on sample vs full; specialties in Clerk **session token** `specialties` + `publicMetadata`; `job_key` BQ `TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm),1,18)), '+/', '-_')`; `job_descriptions`; `appeared_at` parser; Firewall **PR 14**; app-side trial; frozen `public_rank`; IONOS copies Vercel UI CNAME; `country_map` identity+names only; legal footer + `DELETE /api/profile`; plus-addresses are not operators.

Still open:

1. GitHub repo visibility (public vs private)? Default **public**.
2. Clerk production hostname: recommend `clerk.jobs2.graphai.eu`.
3. Revolut: same merchant account as jobs €15 plan, new plan name — confirm with finance.
4. Free-mode for operator caps at 10k — confirm if that is still wanted (req 14 says yes).
5. `applied` flags — hidden. Operator private badge? Default no.
6. SEO `/c/{iso2}` in v1.1.
7. Share `apply_jobs_jobs2_dev` across all preview URLs (yes).

---

## References

- Live grok UI: https://grok.graphai.eu and CSS https://grok.graphai.eu/assets/styles-zhtf7TkA.css
- Live jobs studio: https://jobs.graphai.eu
- Local jobs product: `/Users/username/jobs-graphai-eu` (`lib/pay.js`, `lib/skills-catalog.js`, `lib/skill-certs.js`, `lib/clickhouse.js`, `lib/geo-markets.js`, `lib/session.js`, `lib/admins.js`, `lib/clerk-claims.js`, `e2e/`, `vercel.json`)
- Graphai landing: `/Users/username/graphai` (`SITES.md`, `next.config.mjs`, `app/layout.tsx`)
- Certs loader: `/Users/username/deepline/data/karlsruhe-public-co-job-apps/gcp_spot/load_job_certs_and_conferences.py`
- Talks loader: `…/collect_conference_talks.py`
- Spot bootstrap: `…/startup.sh`, `watchdog.sh`, `hb_tick.sh`, `create_spot_vms.sh`
- Harvest MERGE: `/Users/username/Desktop/application_run_20260925_de_data/eu10k/harvest_toward_1m.py`
- Memory: `~/.grok/memory-v2/workspaces/username-0981b991/topics/{jobs-graphai-eu,apply-jobs-bigquery,grok-graphai-eu,graphai-landing,eu10k-job-harvest}.md`
- Eurostat Statistics API: https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api
- World Bank indicators API: `https://api.worldbank.org/v2/country/{iso2}/indicator/SL.UEM.TOTL.ZS`
- Vercel Fluid Compute pricing: https://vercel.com/docs/functions/usage-and-pricing
- Sentry org/region as used by `jobs-graphai-eu/e2e/sentry-correlate.mjs`: `graphai-ou` / `de.sentry.io`

---

## PR Plan

Each PR is independently reviewable and mergeable. Land in order unless noted.

### PR 1 — Scaffold Next.js studio chrome

- **Title:** `chore: scaffold jobs2 Next.js app with grok chrome tokens`
- **Files:** `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `components/studio-header.tsx`, `components/studio-tabs.tsx`, `public/` (favicon), `README.md`
- **Deps:** none
- **Description:** App Router TS, Tailwind v4 **`@theme --color-*` plus `:root` aliases** from grok CSS, Plus Jakarta Sans, theme-color `#084539`, wordmark, nav, sticky tabs, footer links to graphai.eu imprint/privacy. **No** `clerk init`, **no** Sentry wizard. `npm run dev` shows the empty studio.

### PR 2 — Security headers, robots, security.txt

- **Title:** `chore: vercel headers, robots, security.txt`
- **Files:** `vercel.json`, `app/robots.ts`, `app/.well-known/security.txt/route.ts` (or `public/.well-known/security.txt`)
- **Deps:** PR 1
- **Description:** HSTS/CSP/CORP. **No ACAO** header. No Clerk yet.

### PR 3 — BigQuery DDL and materialize scripts

- **Title:** `feat(bq): jobs2 prod/dev datasets, serving tables, country materialize`
- **Files:** `scripts/bq/ddl.sql`, `scripts/bq/country_map_seed.sql`, `scripts/bq/country_raw_counts.snapshot.sql`, `scripts/bq/materialize.sql`, `scripts/bq/snapshot.sh`, `scripts/bq/sync_dev.sh`, `lib/country.ts`, `lib/skills-catalog.ts`, `lib/job-key.ts`, `lib/job-key.test.ts`
- **Deps:** none (can land parallel to PR 1)
- **Description:** Full DDL including `country_map` (identity ISO2 + explicit names only — **no** DISTINCT leftovers as ZZ), `job_descriptions`, `country_daily_latest` view, frozen `public_rank`. `job_key` **only** `TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')` plus matching TS + golden tests (`+/` cases). Complete `materialize.sql`. Assert serving COUNT vs live `apply_jobs.job_offers`. No PII copy to dev.

### PR 4 — BQ client and public country API

- **Title:** `feat(api): /api/countries and /api/health over serving tables`
- **Files:** `lib/bq.ts`, `app/api/health/route.ts`, `app/api/countries/route.ts`, `app/api/countries/[iso2]/route.ts`, `app/api/countries/[iso2]/series/route.ts`
- **Deps:** PR 1, PR 3
- **Description:** Returns true `n_total` plus `n_visible`. Listings not in this PR. Cache-Control 300s. No Clerk.

### PR 5 — Map + List UI against public APIs

- **Title:** `feat(ui): country map, bar plot, time-series`
- **Files:** `components/country-map.tsx`, `components/country-bar.tsx`, `components/time-series.tsx`, `app/page.tsx`, `public/geo/*`
- **Deps:** PR 4
- **Description:** Leaflet **client-only** (`dynamic(..., { ssr: false })`); log-bucket choropleth; bar of **true** `n_total`; series + empty KPI slot. Natural Earth license in `public/geo/`.

### PR 6 — Jobs tab specialty/certs slider

- **Title:** `feat(ui): specialty combobox, cert checkboxes, vertical k-slider`
- **Files:** `components/specialty-certs-panel.tsx`, `components/vertical-job-slider.tsx`, `app/api/jobs/route.ts`, `app/api/jobs/cert-curve/route.ts`, `app/api/certs/route.ts`
- **Deps:** PR 4
- **Description:** AND SQL as specified; `k=0` special-case; slider `aria-valuenow=k`; anonymous cert-curve on `public_rank<=1000` with empty-state. Combobox filters certs **and** listings.

### PR 7 — Job detail + certs/conferences/talks

- **Title:** `feat(ui): job detail with certificates, conferences, talks`
- **Files:** `app/jobs/[id]/page.tsx`, `app/api/jobs/[id]/route.ts`, `components/job-detail.tsx`
- **Deps:** PR 6, PR 3
- **Description:** Anonymous IDOR 404 outside `public_rank<=1000`. Excerpt only in this PR; paid full text wired in PR 9 via `job_descriptions`.

### PR 8 — Clerk application + onboarding gate

- **Title:** `feat(auth): Clerk Next SDK, proxy UX gate, specialty onboarding`
- **Files:** `proxy.ts`, `app/sign-in/**`, `app/sign-up/**`, `app/onboarding/page.tsx`, `app/api/profile/route.ts`, `lib/profile.ts`, `lib/operators.ts`
- **Deps:** PR 1, PR 3
- **Description:** `clerk init --framework next` on a **new** Clerk app (this PR, not PR 1). **Dashboard:** session token template `{ "specialties": "{{user.public_metadata.specialties}}" }` on the dev instance (repeat on production at upgrade). PUT profile writes `publicMetadata.specialties` + BQ. `proxy.ts` reads **`sessionClaims.specialties` only** — no `currentUser()`, no BQ. Map public; Jobs/List/Settings onboard. DELETE `/api/profile`. Clerk `user.deleted` webhook. e2e: metadata-set user is not redirected.

### PR 9 — Entitlement matrix + free-mode

- **Title:** `feat(entitlement): 1k / 10k / unlimited + free-mode toggle`
- **Files:** `lib/entitlement.ts`, `lib/entitlement.test.ts`, `components/free-mode-toggle.tsx`, Settings tab, visibility helper, paid `job_descriptions` SELECT
- **Deps:** PR 8, PR 4, PR 7
- **Description:** `capFor()` including `lapsed`. Wire listing `public_rank`. Unit tests: gmail/googlemail, plus-address **not** operator, `node --experimental-strip-types --test`.

### PR 10 — Revolut €5 plan + webhook

- **Title:** `feat(billing): Revolut Jobs2 plan 500 cents, app-side trial, webhook`
- **Files:** `lib/revolut.ts`, `lib/revolut.test.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/revolut/route.ts`
- **Deps:** PR 9
- **Description:** App-side 7-day trial primary. `ORDER_*` → paid; cancel/expire → `lapsed`. No `REVOLUT_ORDER_ID` fallback. No Stripe primary. No checkout E2E.

### PR 11 — ClickHouse skill-certs import + KPI ingest

- **Title:** `feat(data): import jobs_skill_certs extras and Eurostat/World Bank KPI`
- **Files:** `scripts/bq/import_clickhouse.py`, `scripts/bq/ingest_kpi.py`, `data/skill-courses.seed.json`, time-series overlay
- **Deps:** PR 3, PR 5
- **Description:** CH extras **not** AND keys. Seed JSON fallback. `EL`→`GR` on KPI ingest. Overlay on country curve.

### PR 12 — Availability worker on apply-spot

- **Title:** `feat(worker): Playwright availability shard on apply-spot`
- **Files:** `scripts/workers/availability_check.py`, `scripts/workers/hb_tick.sh`, `scripts/workers/watchdog.sh`
- **Deps:** PR 3
- **Description:** Optimistic `available`; modulus `GREATEST(23, ceil(n/30000))`; parse `appeared_at`; robots skip unchanged; UI default `all` until probed.

### PR 13 — Sentry Next.js

- **Title:** `feat(obs): @sentry/nextjs project jobs2-graphai-eu`
- **Files:** `instrumentation.ts`, `sentry.*.config.ts`, `app/global-error.tsx`, `next.config.ts` wrap, `e2e/sentry-correlate.mjs`
- **Deps:** PR 1
- **Description:** Sentry wizard **in this PR**. DSN from env; traces; release SHA.

### PR 14 — Vercel Firewall rate limit

- **Title:** `feat(sec): Vercel Firewall 60/min jobs APIs`
- **Files:** `docs/firewall.md`, `lib/rate-limit.ts` (optional app-level 429 if WAF is not enough)
- **Deps:** PR 4
- **Description:** Configure WAF 60 req/min `/api/jobs*`, 10/min checkout. Required before pentest `ratelimit.mjs`.

### PR 15 — Playwright QA (except billing)

- **Title:** `test(e2e): public, map, certs, onboarding, entitlement, security`
- **Files:** `playwright.config.ts`, `e2e/*.spec.ts`, `e2e/report-github.mjs`, `.github/workflows/ci.yml`
- **Deps:** PRs 5–9; KPI/availability assertions `test.skip` unless PRs 11–12 already merged
- **Description:** Matrix in this doc. `aria-valuenow=k`. CI secrets checklist in workflow comments: `BQ_SA_JSON_DEV`, Clerk test keys, seeded `apply_jobs_jobs2_dev`.

### PR 16 — Defensive pentest scripts

- **Title:** `test(pentest): headers, authz, IDOR, injection, rate limit`
- **Files:** `scripts/pentest/*.mjs`
- **Deps:** PR 2, PR 8, PR 9, PR 10, **PR 14 (rate limit)**
- **Description:** Default `PENTEST_BASE_URL` = preview. Allowlist our hosts only. No exploit payloads.

### PR 17 — GitHub + Vercel project + IONOS runbook

- **Title:** `docs: publish runbook, env inventory, operator email template`
- **Files:** `README.md`, `docs/deploy.md`, `docs/dns.md`
- **Deps:** PR 1
- **Description:** Create Vercel project **and** add `jobs2.graphai.eu` first; IONOS CNAME uses the **exact** Vercel UI target (`*.vercel-dns-0xx.com`, same pattern as grok `4b60e832bf51d69d.vercel-dns-013.com` and jobs `77fdd00a9e856e7f.vercel-dns-017.com`). Generic `cname.vercel-dns.com` is fallback only. Do not invent a jobs2 hash. Clerk prod CNAME + **copy session-token template** to the production instance. Operator email uses the same DNS sentence. No secrets.

### PR 18 — Legal extras (imprint footer already in PR 1) + cookie banner hook

- **Title:** `feat(legal): cookie banner gate for analytics, DELETE already in PR 8`
- **Files:** `components/cookie-banner.tsx` (no-op unless analytics env set)
- **Deps:** PR 1, PR 8
- **Description:** Banner only if Vercel Analytics/HubSpot enabled. Privacy/imprint already linked.

### PR 19 — Production wiring (env, scheduled queries, first materialize)

- **Title:** `chore: production BQ schedules and Vercel env (no secret values in git)`
- **Files:** `scripts/bq/scheduler.json`, `docs/env.md`, `docs/ci-secrets.md`
- **Deps:** PRs 3, 11, 12, 17
- **Description:** Cloud Scheduler; **CI secrets checklist**: `BQ_SA_JSON_DEV`, `CLERK_SECRET_KEY` (test instance), `PLAYWRIGHT` user, no prod PII. Human applies Vercel env. Separate web vs scheduler SAs.

Parallel: PRs 3, 13, 17 with PR 1. PR 10 after PR 9. PR 16 after PR 14. PR 15 KPI/availability tests skip until 11–12.
