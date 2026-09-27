#!/usr/bin/env bash
set -euo pipefail
PROJECT=poetic-sentinel-402405
DS=apply_jobs_jobs2_prod
DAY=$(date -u +%Y%m%d)
for t in job_offers_country job_descriptions job_offer_certs; do
  bq --location=EU cp --force "${PROJECT}:${DS}.${t}" "${PROJECT}:${DS}.${t}_${DAY}"
done
echo "snapshot $DAY"
