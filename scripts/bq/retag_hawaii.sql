-- Retag Hawaii (country_iso2=HI) specialties from existing specialty_needles.
-- Does not rebuild job_key / public_rank. Run after Hawaii snapshot, before rollups.

CREATE TEMP FUNCTION fold(s STRING) AS (
  REGEXP_REPLACE(NORMALIZE(LOWER(IFNULL(s, "")), NFD), r'\p{M}', '')
);

MERGE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` T
USING (
  SELECT
    j.job_key,
    IFNULL(s.specialties, IF(TRIM(IFNULL(j.title, '')) = '', ['weitere'], ['general'])) AS specialties
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
  LEFT JOIN (
    SELECT
      j2.job_key,
      ARRAY_AGG(DISTINCT n.id) AS specialties
    FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j2
    JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.specialty_needles` n
      ON STRPOS(
        fold(CONCAT(' ', IFNULL(j2.title, ''), ' ', IFNULL(j2.description_excerpt, ''), ' ')),
        fold(n.needle)
      ) > 0
    WHERE j2.country_iso2 = 'HI'
    GROUP BY j2.job_key
  ) s USING (job_key)
  WHERE j.country_iso2 = 'HI'
) S
ON T.job_key = S.job_key
WHEN MATCHED THEN UPDATE SET specialties = S.specialties;
