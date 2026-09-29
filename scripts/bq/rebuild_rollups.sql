-- Daily series, map stats, specialty counts from current serving jobs.
-- Wrapped as a script so bq query can run the three DDL statements plus the assert SELECT.

BEGIN

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily`
PARTITION BY d CLUSTER BY country_iso2, specialty AS
WITH src AS (
  SELECT
    country_iso2,
    DATE(COALESCE(appeared_at_ts, ingested_at)) AS d,
    availability,
    specialties
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
),
star_daily AS (
  SELECT
    d,
    country_iso2,
    COUNTIF(availability = 'available') AS n_available,
    COUNTIF(availability = 'probably_unavailable') AS n_unavailable,
    COUNT(*) AS n_new
  FROM src
  WHERE d IS NOT NULL
  GROUP BY d, country_iso2
),
spec_daily AS (
  SELECT
    d,
    country_iso2,
    sp AS specialty,
    COUNTIF(availability = 'available') AS n_available,
    COUNTIF(availability = 'probably_unavailable') AS n_unavailable,
    COUNT(*) AS n_new
  FROM src, UNNEST(specialties) AS sp
  WHERE d IS NOT NULL
  GROUP BY d, country_iso2, sp
),
unioned AS (
  SELECT d, country_iso2, '*' AS specialty, n_available, n_unavailable, n_new FROM star_daily
  UNION ALL
  SELECT d, country_iso2, specialty, n_available, n_unavailable, n_new FROM spec_daily
)
SELECT
  d,
  country_iso2,
  specialty,
  SUM(n_available) OVER (PARTITION BY country_iso2, specialty ORDER BY d) AS n_available,
  SUM(n_unavailable) OVER (PARTITION BY country_iso2, specialty ORDER BY d) AS n_unavailable,
  SUM(n_new) OVER (PARTITION BY country_iso2, specialty ORDER BY d) AS n_total
FROM unioned;

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map_stats`
CLUSTER BY country_iso2 AS
SELECT
  country_iso2,
  COUNT(*) AS n_jobs,
  COUNT(DISTINCT company) AS n_companies,
  COUNTIF(
    appeared_at_ts >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE(), MONTH))
    OR (appeared_at_ts IS NULL AND ingested_at >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE(), MONTH)))
  ) AS n_this_month,
  COUNTIF(
    REGEXP_CONTAINS(LOWER(IFNULL(is_remote, "")), r"remote|homeoffice|home office|hybrid|^true$|^yes$|^ja$|^1$")
    OR REGEXP_CONTAINS(LOWER(IFNULL(title, "")), r"remote|homeoffice")
  ) AS n_remote,
  COUNTIF(
    REGEXP_CONTAINS(LOWER(IFNULL(title, "")), r"senior|principal|staff |teamleiter|filialleiter|abteilungsleiter|gruppenleiter|head of|director|leiter")
  ) AS n_senior
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
GROUP BY country_iso2;

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_specialty_counts`
PARTITION BY as_of CLUSTER BY country_iso2, specialty AS
SELECT
  CURRENT_DATE() AS as_of,
  country_iso2,
  sp AS specialty,
  COUNTIF(availability = 'available') AS n_available,
  COUNTIF(availability = 'probably_unavailable') AS n_unavailable,
  COUNT(*) AS n_total
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`, UNNEST(specialties) AS sp
GROUP BY country_iso2, sp;

SELECT
  (SELECT COUNT(*) FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily`) AS daily_rows,
  (SELECT COUNT(*) FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map_stats`) AS map_rows,
  (SELECT SUM(n_jobs) FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map_stats`) AS jobs;

END;
