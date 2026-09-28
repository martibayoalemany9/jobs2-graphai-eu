-- Rebuild jobs2 serving certs from harvest job_certifications (occupation + catalog).
CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_certs`
CLUSTER BY country_iso2, cert_id AS
SELECT
  c.job_url,
  j.job_key,
  j.country_iso2,
  COALESCE(
    IF(c.match_kind = 'occupation' AND c.evidence IS NOT NULL AND c.evidence != '', c.evidence, NULL),
    cat.cert_id,
    LOWER(REGEXP_REPLACE(c.certification_name, r'[^a-zA-Z0-9]+', '-'))
  ) AS cert_id,
  c.certification_name,
  c.provider,
  c.certification_url,
  c.match_kind,
  c.evidence
FROM `poetic-sentinel-402405.apply_jobs.job_certifications` c
JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
  ON j.url_norm = `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(c.job_url)
LEFT JOIN `poetic-sentinel-402405.apply_jobs.certification_catalog` cat
  ON LOWER(cat.certification_name) = LOWER(c.certification_name);
