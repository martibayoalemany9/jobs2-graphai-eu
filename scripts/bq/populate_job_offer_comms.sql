-- Serving-only: applied offers that have an employer reply product.
-- Harvest apply_jobs.job_offers is read-only. Bodies stay in apply_jobs.dismissal_emails.

CREATE TABLE IF NOT EXISTS `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_comms` (
  job_key STRING NOT NULL,
  applied BOOL NOT NULL,
  reply_product STRING,
  info_note STRING,
  updated_at TIMESTAMP NOT NULL
)
CLUSTER BY job_key;

MERGE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_comms` T
USING (
  WITH harvest AS (
    SELECT
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(url), r"[?#].*$", ""), r"/+$", "")) AS un
    FROM `poetic-sentinel-402405.apply_jobs.job_offers`
    WHERE url IS NOT NULL AND TRIM(url) != ""
      AND LOWER(IFNULL(applied_status, "")) IN ("submitted", "dismissed")
  ),
  mails AS (
    SELECT
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(job_url), r"[?#].*$", ""), r"/+$", "")) AS un,
      ANY_VALUE(NULLIF(TRIM(reply_product), "")) AS reply_product
    FROM `poetic-sentinel-402405.apply_jobs.dismissal_emails`
    WHERE job_url IS NOT NULL AND TRIM(job_url) != ""
      AND NULLIF(TRIM(reply_product), "") IS NOT NULL
    GROUP BY 1
  )
  SELECT
    j.job_key,
    TRUE AS applied,
    m.reply_product,
    CAST(NULL AS STRING) AS info_note
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
  INNER JOIN harvest h ON h.un = j.url_norm
  INNER JOIN mails m ON m.un = j.url_norm
) S
ON T.job_key = S.job_key
WHEN MATCHED THEN UPDATE SET
  applied = S.applied,
  reply_product = S.reply_product,
  updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT (job_key, applied, reply_product, info_note, updated_at)
VALUES (S.job_key, S.applied, S.reply_product, S.info_note, CURRENT_TIMESTAMP());

-- T-Systems Iberia Hiring Team replied via SmartRecruiters claiming a prior interview
-- that did not take place. Stamp the concrete T-Systems listing in serving.
MERGE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_comms` T
USING (
  SELECT job_key
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
  WHERE LOWER(company) IN (
    "t-systems",
    "t-systems international",
    "t-systems iberia",
    "t-systems iberia s.a.u.",
    "t-systems iberia s.a."
  )
) S
ON T.job_key = S.job_key
WHEN MATCHED THEN UPDATE SET
  applied = TRUE,
  reply_product = "SmartRecruiters",
  info_note = "In at least one case T-Systems Iberia Hiring Team answered the application through SmartRecruiters as if there had already been an interview. There was no interview.",
  updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT (job_key, applied, reply_product, info_note, updated_at)
VALUES (
  S.job_key,
  TRUE,
  "SmartRecruiters",
  "In at least one case T-Systems Iberia Hiring Team answered the application through SmartRecruiters as if there had already been an interview. There was no interview.",
  CURRENT_TIMESTAMP()
);
