-- First/full materialize of jobs2 serving tables from apply_jobs.job_offers.
-- job_key is ONLY TRANSLATE(TO_BASE64(SUBSTR(SHA256(url_norm), 1, 18)), '+/', '-_')

CREATE TEMP FUNCTION url_norm(u STRING) AS (
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(u, "")), r"[?#].*$", ""), r"/+$", ""))
);
CREATE TEMP FUNCTION job_key(u STRING) AS (
  TRANSLATE(TO_BASE64(SUBSTR(SHA256(u), 1, 18)), '+/', '-_')
);
CREATE TEMP FUNCTION parse_appeared_at(s STRING) AS (
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y', TRIM(s)),
    IF(REGEXP_CONTAINS(TRIM(IFNULL(s, "")), r'^[0-9]{12,}$'), TIMESTAMP_MILLIS(SAFE_CAST(TRIM(s) AS INT64)), NULL)
  )
);
CREATE TEMP FUNCTION host_tld(u STRING) AS (
  LOWER(REGEXP_EXTRACT(REGEXP_EXTRACT(IFNULL(u, ""), r"://([^/]+)"), r"\.([a-z0-9]+)$"))
);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.specialty_needles` AS
SELECT * FROM UNNEST([
  STRUCT('python' AS id, 'python' AS needle), ('python','django'), ('python','flask'), ('python','fastapi'),
  ('javascript','javascript'), ('javascript','node.js'), ('javascript','react'),
  ('typescript','typescript'), ('sql','sql'), ('sql','postgres'), ('sql','mysql'),
  ('cloud','google cloud'), ('cloud','gcp'), ('cloud','aws'), ('cloud','azure'), ('cloud','kubernetes'), ('cloud','terraform'),
  ('ml','machine learning'), ('ml','pytorch'), ('ml','tensorflow'), ('ml','llm'),
  ('systems','c++'), ('systems','rust'), ('systems','golang'),
  ('embedded','embedded'), ('embedded','firmware'),
  ('networking','networking'), ('networking','telecom'), ('networking','5g'),
  ('security','security'), ('security','cybersecurity'),
  ('dataeng','data engineering'), ('dataeng','spark'), ('dataeng','airflow'), ('dataeng','kafka'),
  ('product','product management'), ('ux','user experience'), ('ux','figma'),
  ('project','project management'), ('project','agile'), ('comms','communication'),
  ('leadership','leadership'), ('stakeholder','stakeholder'), ('problem','problem solving'),
  ('nursing','krankenschwester'), ('nursing','krankenpfleger'), ('nursing','krankenpflege'),
  ('nursing','pflegefachkraft'), ('nursing','pflegefach'), ('nursing','registered nurse'),
  ('nursing','nursing'), ('nursing','nurse'), ('nursing','hebamme'), ('nursing','midwife'),
  ('teaching','lehrerin'), ('teaching','lehrer'), ('teaching','teacher'), ('teaching','teaching'),
  ('teaching','unterricht'), ('teaching','erzieherin'), ('teaching','erzieher'),
  ('social','sozialarbeiter'), ('social','sozialpädagog'), ('social','sozialpadagog'),
  ('social','social worker'), ('social','social work'), ('social','caseworker')
]);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
CLUSTER BY country_iso2, public_rank AS
WITH src AS (
  SELECT
    url_norm(url) AS url_norm,
    url,
    company,
    title,
    job_location,
    headquarters_location,
    is_remote,
    country AS country_raw,
    appeared_at,
    parse_appeared_at(appeared_at) AS appeared_at_ts,
    source,
    SUBSTR(IFNULL(description, ""), 1, 1200) AS description_excerpt,
    LENGTH(IFNULL(description, "")) AS description_len,
    description
  FROM `poetic-sentinel-402405.apply_jobs.job_offers`
  WHERE url IS NOT NULL AND TRIM(url) != ""
  QUALIFY ROW_NUMBER() OVER (PARTITION BY url_norm(url) ORDER BY LENGTH(IFNULL(description,"")) DESC) = 1
),
mapped AS (
  SELECT
    s.*,
    job_key(s.url_norm) AS job_key,
    COALESCE(
      m.country_iso2,
      CASE host_tld(s.url)
        WHEN 'uk' THEN 'GB' WHEN 'de' THEN 'DE' WHEN 'nl' THEN 'NL' WHEN 'cz' THEN 'CZ'
        WHEN 'fr' THEN 'FR' WHEN 'us' THEN 'US' WHEN 'at' THEN 'AT' WHEN 'ch' THEN 'CH'
        WHEN 'be' THEN 'BE' WHEN 'es' THEN 'ES' WHEN 'it' THEN 'IT' WHEN 'pl' THEN 'PL'
        WHEN 'se' THEN 'SE' WHEN 'ie' THEN 'IE' WHEN 'dk' THEN 'DK' WHEN 'fi' THEN 'FI'
        WHEN 'no' THEN 'NO' WHEN 'pt' THEN 'PT' WHEN 'sg' THEN 'SG' WHEN 'jp' THEN 'JP'
        WHEN 'ca' THEN 'CA' WHEN 'au' THEN 'AU' WHEN 'in' THEN 'IN' WHEN 'cn' THEN 'CN'
        WHEN 'kr' THEN 'KR' WHEN 'br' THEN 'BR' WHEN 'mx' THEN 'MX' ELSE NULL
      END,
      'ZZ'
    ) AS country_iso2
  FROM src s
  LEFT JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_map` m
    ON m.raw_string = LOWER(TRIM(IFNULL(s.country_raw, "")))
),
skills AS (
  SELECT url_norm(url) AS url_norm, ARRAY_AGG(DISTINCT LOWER(skill) IGNORE NULLS) AS skill_list
  FROM `poetic-sentinel-402405.apply_jobs.job_skills`
  GROUP BY 1
),
needles AS (
  SELECT m.job_key, ARRAY_AGG(DISTINCT n.id) AS specialties
  FROM mapped m
  JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.specialty_needles` n
    ON STRPOS(LOWER(CONCAT(IFNULL(m.title,""), " ", IFNULL(m.description_excerpt,""))), n.needle) > 0
  GROUP BY 1
),
ranked AS (
  SELECT
    m.* EXCEPT(description),
    COALESCE(n.specialties, []) AS specialties,
    ROW_NUMBER() OVER (PARTITION BY m.country_iso2 ORDER BY FARM_FINGERPRINT(m.url_norm)) AS public_rank
  FROM mapped m
  LEFT JOIN needles n USING (job_key)
)
SELECT
  job_key,
  url,
  url_norm,
  company,
  title,
  job_location,
  headquarters_location,
  is_remote,
  country_raw,
  country_iso2,
  appeared_at,
  appeared_at_ts,
  source,
  description_excerpt,
  description_len,
  specialties,
  public_rank,
  'available' AS availability,
  CURRENT_TIMESTAMP() AS ingested_at
FROM ranked;

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_descriptions`
CLUSTER BY job_key AS
SELECT
  `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_key`(
    `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(url)
  ) AS job_key,
  description
FROM `poetic-sentinel-402405.apply_jobs.job_offers`
WHERE description IS NOT NULL AND LENGTH(description) > 0
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(url)
  ORDER BY LENGTH(description) DESC
) = 1;

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_certs`
CLUSTER BY country_iso2, cert_id AS
SELECT
  c.job_url,
  j.job_key,
  j.country_iso2,
  COALESCE(cat.cert_id, LOWER(REGEXP_REPLACE(c.certification_name, r'[^a-zA-Z0-9]+', '-'))) AS cert_id,
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

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_conferences`
CLUSTER BY job_key AS
SELECT
  c.job_url,
  j.job_key,
  c.conference_name,
  c.organizer,
  c.conference_url,
  c.location,
  c.start_date,
  c.end_date,
  c.relation,
  c.topics
FROM `poetic-sentinel-402405.apply_jobs.company_conferences` c
JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
  ON j.url_norm = `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(c.job_url);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_talks`
CLUSTER BY job_key AS
SELECT
  t.job_url,
  j.job_key,
  t.conf_id,
  t.conference_name,
  t.talk_id,
  t.talk_title,
  t.talk_description,
  t.speakers,
  t.talk_url,
  t.talk_type,
  t.score
FROM `poetic-sentinel-402405.apply_jobs.job_conference_talks` t
JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
  ON j.url_norm = `poetic-sentinel-402405.apply_jobs_jobs2_prod.url_norm`(t.job_url);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_count_daily`
PARTITION BY d CLUSTER BY country_iso2, specialty AS
SELECT
  CURRENT_DATE() AS d,
  country_iso2,
  '*' AS specialty,
  COUNTIF(availability = 'available') AS n_available,
  COUNTIF(availability = 'probably_unavailable') AS n_unavailable,
  COUNT(*) AS n_total
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

-- Assert serving vs harvest (informational SELECT; scheduled query fails if you wrap with ASSERT)
SELECT
  (SELECT COUNT(*) FROM `poetic-sentinel-402405.apply_jobs.job_offers`) AS src,
  (SELECT COUNT(*) FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`) AS serving,
  (SELECT COUNTIF(country_iso2 = 'ZZ') FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`) AS zz;
