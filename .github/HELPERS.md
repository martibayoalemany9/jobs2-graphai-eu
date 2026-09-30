# GitHub Automation & Operational Helpers

This document outlines the automated QA loops, pentest monitors, Sentry incident synchronization, and GCP remote execution helpers for \`jobs2.graphai.eu\`.

---

## 1. Automated Continuous Quality Assurance (\`qa-loop.yml\`)
- **Workflow**: \`.github/workflows/qa-loop.yml\`
- **Cadence**: Every 30 minutes (\`*/30 * * * *\`) & on manual dispatch.
- **Target**: Production environment (\`https://jobs2.graphai.eu\`).
- **Engine**: Playwright Chromium running:
  - \`e2e/public.spec.ts\` (health, capture camera auth, chrome, imprint, security.txt)
  - \`e2e/features-today.spec.ts\` (Oman selector, colored time series fill, board icons, skill pills, translations JA/ET/RU/CS, mailto report)
  - \`e2e/job-detail.spec.ts\` (description view, certifications modal, employer reply stamp, board compare modal)
  - \`e2e/map.spec.ts\` (country choropleth, loading progress bar, worldwide scope, availability filter, multilingual labels)
  - \`e2e/certs.spec.ts\` & \`e2e/idor.spec.ts\` (specialty sliders, cap security boundaries)
- **Failure Trigger**: Automatically files an open issue on GitHub titled \`qa: Playwright against production failed\` with label \`qa\`.

---

## 2. Automated Pentesting & Security Monitor (\`pentest-loop.yml\`)
- **Workflow**: \`.github/workflows/pentest-loop.yml\`
- **Cadence**: Every 30 minutes & on push to \`scripts/pentest/**\`.
- **Engine**: \`scripts/pentest/run.mjs\` testing IDOR, unauthenticated route isolation, and security headers.
- **Failure Trigger**: Automatically files an open issue on GitHub titled \`pentest: production host failed\` with label \`pentest\`.

---

## 3. Sentry Incident Synchronizer (\`scripts/sentry-issues.sh\`)
- **Script**: \`scripts/sentry-issues.sh\`
- **Function**: Polls the Sentry REST API for \`is:unresolved\` issues in project \`jobs2-graphai-eu\` (organization \`graphai-ou\`, region \`de.sentry.io\`).
- **Deduplication**: Checks for existing GitHub issues referencing the Sentry \`shortId\` (e.g. \`JOBS2-GRAPHAI-EU-1\`) and avoids duplicates.
- **Active Tracked Incidents**:
  - Issue #5: \`JOBS2-GRAPHAI-EU-1\` (Hydration Error on \`/?view=jobs\`)
  - Issue #6: \`JOBS2-GRAPHAI-EU-5\` (Leaflet \`_leaflet_pos\` undefined error)
  - Issue #7: \`JOBS2-GRAPHAI-EU-4\` (BigQuery array parameter type error on \`PUT /api/profile\`)
  - Issue #8: \`JOBS2-GRAPHAI-EU-3\` (JSON parse unexpected end of input)
  - Issue #9: \`JOBS2-GRAPHAI-EU-2\` (Rate limiting 429 on profile update)

---

## 4. GCP Spot VM Remote Execution (\`apply-spot-1\`)
- **Host**: \`apply-spot-1.europe-west1-d.c.poetic-sentinel-402405.internal\` (External IP: \`34.38.142.199\`)
- **Access**: OS Login via \`martibayoalemany4_googlemail_com\` with SSH key \`~/.ssh/apply_spot\`.
- **Environment**: Python 3.12 with Playwright in \`/opt/apply/venv\`, browser binaries in \`/home/username/.cache/ms-playwright\`.
- **Watchdog / Heartbeat Protocol**:
  - Heartbeat file: \`/opt/apply/HEARTBEAT\`
  - Update command: \`date -u +%s > /opt/apply/HEARTBEAT\`
  - Idle timeout: 2700s watchdog automatic shutdown.
- **Execution Command**:
  \`\`\`bash
  ssh -i ~/.ssh/apply_spot martibayoalemany4_googlemail_com@34.38.142.199 \
    "sudo -u username PLAYWRIGHT_BROWSERS_PATH=/home/username/.cache/ms-playwright /opt/apply/venv/bin/python3 /tmp/test_deployment_playwright.py"
  \`\`\`

---

## 5. Sentry Seer Fix Automation Guide
- **Current State**: Project settings already enable Seer coding agent (\`enableSeerCoding: true\`, \`defaultCodingAgent: "seer"\`, \`autofixAutomationTuning: "high"\`).
- **Prerequisites to Enable Automatic PR Suggestions**:
  1. **Organization GenAI Consent**: Sentry Organization Settings -> Legal & Compliance -> Accept GenAI terms (\`genAIConsent: true\`).
  2. **GitHub Repository Integration**: Sentry Settings -> Integrations -> GitHub -> Install Sentry app on \`martibayoalemany9/jobs2-graphai-eu\`.
  3. Once connected, Seer analyzes issue stack traces against repository code and automatically posts fix recommendations and creates pull requests.
