-- Rebuild jobs2 serving certs from harvest job_certifications plus university-degree matches.

MERGE `poetic-sentinel-402405.apply_jobs.certification_catalog` T
USING (
  SELECT * FROM UNNEST([
    STRUCT('degree-university' AS cert_id, 'University degree / Hochschulabschluss' AS certification_name, 'Higher education' AS provider, 'https://www.hrk.de/' AS certification_url, r'hochschulabschluss|universit|abgeschlossenes studium|university degree|degree required|fachhochschul' AS mention_regex, r'hochschul|bachelor|master|diplom' AS skill_regex),
    STRUCT('degree-bachelor', 'Bachelor', 'Higher education', 'https://www.hrk.de/', r'bachelor|b\.sc|b\.eng|b\.a\.', r'bachelor'),
    STRUCT('degree-master', 'Master / Diplom', 'Higher education', 'https://www.hrk.de/', r'\bmaster\b|m\.sc|m\.eng|diplom-ingenieur|\bdiplom\b|magister', r'master|diplom'),
    STRUCT('degree-phd', 'Doctorate / PhD', 'Higher education', 'https://www.hrk.de/', r'\bphd\b|promotion|doktorand|doctorate|\bdr\.\s', r'phd|doktor')
  ])
) S
ON T.cert_id = S.cert_id
WHEN MATCHED THEN UPDATE SET
  certification_name = S.certification_name,
  provider = S.provider,
  certification_url = S.certification_url,
  mention_regex = S.mention_regex,
  skill_regex = S.skill_regex
WHEN NOT MATCHED THEN INSERT
  (cert_id, certification_name, provider, certification_url, mention_regex, skill_regex)
  VALUES (S.cert_id, S.certification_name, S.provider, S.certification_url, S.mention_regex, S.skill_regex);

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
  ON LOWER(cat.certification_name) = LOWER(c.certification_name)

UNION ALL

SELECT
  j.url AS job_url,
  j.job_key,
  j.country_iso2,
  d.cert_id,
  d.certification_name,
  d.provider,
  d.certification_url,
  'degree' AS match_kind,
  d.cert_id AS evidence
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
JOIN UNNEST([
  STRUCT('degree-phd' AS cert_id, 'Doctorate / PhD' AS certification_name, 'Higher education' AS provider, 'https://www.hrk.de/' AS certification_url, r'(\bphd\b|promotion|doktorand|doctorate)' AS rx),
  STRUCT('degree-master', 'Master / Diplom', 'Higher education', 'https://www.hrk.de/', r'(\bmaster\b|m\.sc|m\.eng|diplom-ingenieur|\bdiplom\b|magister)'),
  STRUCT('degree-bachelor', 'Bachelor', 'Higher education', 'https://www.hrk.de/', r'(bachelor|b\.sc|b\.eng)'),
  STRUCT('degree-university', 'University degree / Hochschulabschluss', 'Higher education', 'https://www.hrk.de/', r'(hochschulabschluss|universitätsabschluss|universitaetsabschluss|abgeschlossenes studium|university degree|degree required|fachhochschul)')
]) d
ON REGEXP_CONTAINS(LOWER(CONCAT(IFNULL(j.title, ''), ' ', IFNULL(j.description_excerpt, ''))), d.rx);
