CREATE SCHEMA IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod`
OPTIONS (location = "EU", description = "jobs2.graphai.eu production");

CREATE SCHEMA IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_dev`
OPTIONS (location = "EU", description = "jobs2.graphai.eu development");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map` (
  raw_string STRING NOT NULL,
  country_iso2 STRING NOT NULL,
  source STRING
)
CLUSTER BY raw_string;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_descriptions` (
  job_key STRING NOT NULL,
  description STRING
)
CLUSTER BY job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` (
  job_key STRING NOT NULL,
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
  appeared_at_ts TIMESTAMP,
  source STRING,
  description_excerpt STRING,
  description_len INT64,
  specialties ARRAY<STRING>,
  public_rank INT64,
  availability STRING,
  ingested_at TIMESTAMP NOT NULL
)
CLUSTER BY country_iso2, public_rank
OPTIONS (description = "jobs2 serving table; never SELECT apply_jobs.job_offers from the web app");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_boards` (
  job_key STRING NOT NULL,
  group_id STRING NOT NULL,
  master_job_key STRING NOT NULL,
  is_master BOOL NOT NULL,
  member_rank INT64,
  master_rank INT64,
  board_id STRING,
  source STRING,
  url STRING,
  country_iso2 STRING
)
CLUSTER BY country_iso2, master_job_key
OPTIONS (description = "Origin job-board per serving offer; is_master rows are unique listings for stats");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.skill_needles` (
  id STRING NOT NULL,
  label STRING,
  needle STRING NOT NULL,
  boundary BOOL,
  rx STRING
)
CLUSTER BY id;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_skills` (
  job_key STRING NOT NULL,
  skill_id STRING NOT NULL,
  skill_label STRING,
  evidence STRING,
  source STRING
)
CLUSTER BY job_key, skill_id;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_screenshots` (
  screenshot_id STRING NOT NULL,
  captured_at TIMESTAMP NOT NULL,
  clerk_user_id STRING,
  clerk_email STRING,
  job_url STRING,
  url_norm STRING,
  title STRING,
  company STRING,
  job_location STRING,
  country STRING,
  ocr_text STRING,
  image_png BYTES,
  image_sha256 STRING,
  image_width INT64,
  image_height INT64,
  mime_type STRING,
  ingest_status STRING
)
CLUSTER BY url_norm
OPTIONS (description = "Camera-capture screenshots that prove a job offer was on screen");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_certs` (
  job_url STRING NOT NULL,
  job_key STRING NOT NULL,
  country_iso2 STRING NOT NULL,
  cert_id STRING NOT NULL,
  certification_name STRING,
  provider STRING,
  certification_url STRING,
  match_kind STRING,
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

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.skill_certs_imported` (
  skill_id STRING,
  skill_name STRING,
  level STRING,
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
  specialty STRING,
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
  found BOOL,
  evidence STRING,
  worker STRING
)
PARTITION BY DATE(checked_at)
CLUSTER BY job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_availability_status` (
  job_key STRING,
  job_url STRING,
  status STRING,
  last_http_status INT64,
  last_checked_at TIMESTAMP,
  last_found_at TIMESTAMP,
  miss_streak INT64
)
CLUSTER BY status, job_key;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.kpi_country_monthly` (
  year_month DATE,
  country_iso2 STRING,
  unemployment_rate FLOAT64,
  source STRING,
  fetched_at TIMESTAMP
)
CLUSTER BY country_iso2;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.profiles` (
  clerk_user_id STRING NOT NULL,
  email STRING NOT NULL,
  email_canonical STRING NOT NULL,
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
  provider STRING,
  status STRING,
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
  paid_at TIMESTAMP,
  email_canonical STRING,
  provider STRING,
  session_id STRING,
  status STRING,
  amount_cents INT64,
  note STRING
)
PARTITION BY DATE(paid_at)
CLUSTER BY email_canonical;

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.specialty_needles` (
  id STRING,
  needle STRING
);

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map_stats` (
  country_iso2 STRING NOT NULL,
  n_jobs INT64,
  n_companies INT64,
  n_this_month INT64,
  n_remote INT64,
  n_senior INT64
)
CLUSTER BY country_iso2;

CREATE OR REPLACE VIEW `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_daily_latest` AS
SELECT * FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily`
WHERE specialty = '*'
QUALIFY ROW_NUMBER() OVER (PARTITION BY country_iso2 ORDER BY d DESC) = 1;

CREATE OR REPLACE FUNCTION `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(u STRING)
AS (LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(u, "")), r"[?#].*$", ""), r"/+$", "")));

CREATE OR REPLACE FUNCTION `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_key`(u STRING)
AS (TRANSLATE(TO_BASE64(SUBSTR(SHA256(u), 1, 18)), '+/', '-_'));

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_title_translations` (
  source_title STRING NOT NULL,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, source_title
OPTIONS (description = "Unique source-title cache for catalog locales en/de/nl/fr/cs/ja/et/ru");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_translations` (
  job_key STRING NOT NULL,
  url STRING,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  source_title STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, job_key
OPTIONS (description = "Per-listing title/excerpt translations; web app LEFT JOINs on job_key+locale");

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_correction_requests` (
  requested_at TIMESTAMP,
  job_key STRING,
  job_url STRING,
  title STRING,
  company STRING,
  kind STRING,
  message STRING,
  contact_email STRING,
  locale STRING,
  user_agent STRING,
  notified BOOL
)
PARTITION BY DATE(requested_at)
CLUSTER BY job_key
OPTIONS (description = "Visitor deletion/correction requests; notify hello@graphai.eu");
