-- Screenshot truth table for jobs2 camera captures. BYTES hold the PNG/JPEG.
-- Also cloned on harvest apply_jobs so the image outlives serving rebuilds.

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs.job_offer_screenshots` (
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

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_dev.job_offer_screenshots` (
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
CLUSTER BY url_norm;
