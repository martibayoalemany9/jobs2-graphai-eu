# jobs2.graphai.eu

Jobs intelligence studio. Sibling of [jobs.graphai.eu](https://jobs.graphai.eu). Look and feel matches [grok.graphai.eu](https://grok.graphai.eu).

## Caps

| Who | Listings per country |
| --- | --- |
| Anonymous | 1,000 |
| Signed-in free / 7-day trial / free-mode | 10,000 |
| Paid Revolut (€5 / month) or operator | unlimited |

Operator: `martibayoalemany@gmail.com` and `martibayoalemany@googlemail.com` only.

Country **totals** on the map/bar are the true harvest counts. Listings stay capped.

## Develop

```bash
cp .env.example .env.local
# Clerk, BQ_DATASET=apply_jobs_jobs2_dev, Sentry DSN
npm install --ignore-scripts
npm run dev
```

```bash
npm test                 # unit (job_key, entitlement, revolut HMAC)
npm run test:e2e         # Playwright, except billing checkout
npm run test:pentest     # defensive checks of our host
```

## BigQuery

Project `poetic-sentinel-402405`, location EU.

- Harvest source of truth: `apply_jobs` (read-only)
- Production: `apply_jobs_jobs2_prod`
- Development: `apply_jobs_jobs2_dev` (scheduled non-PII copy)

```bash
npm run bq:ddl
npm run bq:materialize
npm run bq:sync-dev
npm run import:certs
npm run import:kpi
```

`job_key` is `TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')`.

## Clerk production

New Clerk application. Session token template on **dev and prod**:

```json
{ "specialties": "{{user.public_metadata.specialties}}" }
```

Recommended hostname: `clerk.jobs2.graphai.eu`.

## DNS

See [docs/ionos-dns.md](docs/ionos-dns.md). Create the Vercel project first, then CNAME `jobs2` to the exact Vercel target (`*.vercel-dns-0xx.com`).

## Cost at 1 million users

See the design document `docs/design.md` cost section. v1 is BQ + ISR. The 1M playbook is GCS/KV snapshots, Clerk Pro MRU overage (~€2.6k at 200k retained signed-in users), Vercel Fluid Compute (no pinned instances).
