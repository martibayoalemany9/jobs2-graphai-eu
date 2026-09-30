#!/usr/bin/env bash
set -euo pipefail
PROJECT=poetic-sentinel-402405
SRC=apply_jobs_jobs2_prod
DST=apply_jobs_jobs2_dev
# Non-PII serving tables only. Never copy profiles / entitlements / payments.
TABLES=(
  country_map job_offers_country job_descriptions job_offer_certs
  job_offer_conferences job_offer_talks skill_certs_imported
  country_specialty_counts job_count_daily country_map_stats job_availability_checks
  job_availability_status kpi_country_monthly specialty_needles
  job_title_translations job_offer_translations
  skill_needles job_offer_skills
)
for t in "${TABLES[@]}"; do
  echo "copy $t"
  bq --location=EU cp --force "${PROJECT}:${SRC}.${t}" "${PROJECT}:${DST}.${t}" || true
done
echo "dev sync done"
