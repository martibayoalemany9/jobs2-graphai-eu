#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
bq query --project_id=poetic-sentinel-402405 --location=EU --use_legacy_sql=false < "$ROOT/ddl.sql"
bq query --project_id=poetic-sentinel-402405 --location=EU --use_legacy_sql=false < "$ROOT/country_map_seed.sql"
# Clone DDL objects into dev (tables created empty; sync_dev copies data)
sed 's/apply_jobs_jobs2_prod/apply_jobs_jobs2_dev/g' "$ROOT/ddl.sql" \
  | bq query --project_id=poetic-sentinel-402405 --location=EU --use_legacy_sql=false
sed 's/apply_jobs_jobs2_prod/apply_jobs_jobs2_dev/g' "$ROOT/country_map_seed.sql" \
  | bq query --project_id=poetic-sentinel-402405 --location=EU --use_legacy_sql=false
echo "ddl applied"
