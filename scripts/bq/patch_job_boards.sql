-- Origin job-board per serving offer + cross-board duplicate groups.
-- Master = earliest appeared_at_ts, then ingested_at, then job_key.
-- Collapse only when DISTINCT board_id >= 2 on country|fold(company)|fold(title)|fold(location).
-- Same-board lookalikes stay separate. Run after materialize, before rebuild_rollups.

BEGIN

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_boards`
CLUSTER BY country_iso2, master_job_key
OPTIONS (description = "Origin job-board per serving offer; is_master rows are unique listings for stats")
AS
WITH base AS (
  SELECT
    job_key,
    url,
    source,
    country_iso2,
    appeared_at_ts,
    ingested_at,
    public_rank,
    CASE
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"stepstone") THEN "stepstone"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"linkedin") THEN "linkedin"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"indeed") THEN "indeed"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"xing\.com") THEN "xing"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"personio") THEN "personio"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"monster\.") THEN "monster"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"arbeitsagentur")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"arbeitsagentur\.de") THEN "arbeitsagentur"
      WHEN LOWER(IFNULL(source, "")) = "eures"
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"europa\.eu/eures") THEN "eures"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"^mpsv")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"uradprace") THEN "mpsv"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"reed")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"reed\.co\.uk") THEN "reed"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"greenhouse")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"greenhouse\.io") THEN "greenhouse"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"lever")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"lever\.co") THEN "lever"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"smartrecruiters")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"smartrecruiters") THEN "smartrecruiters"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"himalayas")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"himalayas\.app") THEN "himalayas"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"usajobs")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"usajobs\.gov") THEN "usajobs"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"france_travail")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"francetravail|pole-emploi") THEN "france_travail"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"apple")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"apple\.com") THEN "apple"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"mycareersfuture")
        OR REGEXP_CONTAINS(LOWER(IFNULL(url, "")), r"mycareersfuture") THEN "mycareersfuture"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"^planned_jobs") THEN "planned"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"arbeitnow") THEN "arbeitnow"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"jobicy") THEN "jobicy"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"remoteok") THEN "remoteok"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"devitjobs") THEN "devitjobs"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"musikforschung") THEN "musikforschung"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"wissenschaftsstellen") THEN "wissenschaftsstellen"
      WHEN REGEXP_CONTAINS(LOWER(IFNULL(source, "")), r"google") THEN "google"
      ELSE COALESCE(
        NULLIF(
          REGEXP_REPLACE(REGEXP_REPLACE(LOWER(IFNULL(source, "other")), r"\.(csv|jsonl|json)$", ""), r"[^a-z0-9]+", "_"),
          ""
        ),
        "other"
      )
    END AS board_id,
    TRIM(REGEXP_REPLACE(LOWER(IFNULL(company, "")), r"[^a-z0-9]+", " ")) AS company_fold,
    TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(IFNULL(title, "")),
        r"[\(（]?\s*(m\s*/\s*[wfd]\s*/\s*[wfdx]|w\s*/\s*m\s*/\s*d|f\s*/\s*m\s*/\s*d|d\s*/\s*m\s*/\s*w|all genders|alle geschlechter)\s*[\)）]?",
        " "
      ),
      r"[^a-z0-9]+", " "
    )) AS title_fold,
    TRIM(REGEXP_REPLACE(LOWER(IFNULL(job_location, "")), r"[^a-z0-9]+", " ")) AS loc_fold
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
),
tagged AS (
  SELECT
    * EXCEPT (company_fold, title_fold, loc_fold),
    IF(
      company_fold = "" OR title_fold = "",
      CAST(NULL AS STRING),
      CONCAT(country_iso2, "|", company_fold, "|", title_fold, "|", loc_fold)
    ) AS cand_key
  FROM base
),
group_stats AS (
  SELECT cand_key, COUNT(DISTINCT board_id) AS n_boards
  FROM tagged
  WHERE cand_key IS NOT NULL
  GROUP BY cand_key
),
per_board AS (
  SELECT
    t.*,
    g.n_boards,
    ROW_NUMBER() OVER (
      PARTITION BY t.cand_key, t.board_id
      ORDER BY t.appeared_at_ts ASC NULLS LAST, t.ingested_at ASC, t.job_key ASC
    ) AS board_rn
  FROM tagged t
  LEFT JOIN group_stats g ON g.cand_key = t.cand_key
),
grouped AS (
  SELECT
    p.* EXCEPT (n_boards, board_rn),
    IF(p.cand_key IS NOT NULL AND p.n_boards >= 2 AND p.board_rn = 1, p.cand_key, p.job_key) AS group_id
  FROM per_board p
),
ranked AS (
  SELECT
    g.*,
    ROW_NUMBER() OVER (
      PARTITION BY g.group_id
      ORDER BY g.appeared_at_ts ASC NULLS LAST, g.ingested_at ASC, g.job_key ASC
    ) AS member_rank
  FROM grouped g
),
with_master AS (
  SELECT
    r.*,
    FIRST_VALUE(r.job_key) OVER (PARTITION BY r.group_id ORDER BY r.member_rank) AS master_job_key
  FROM ranked r
),
masters AS (
  SELECT
    job_key AS master_job_key,
    ROW_NUMBER() OVER (
      PARTITION BY country_iso2
      ORDER BY public_rank ASC NULLS LAST, job_key ASC
    ) AS master_rank
  FROM with_master
  WHERE member_rank = 1
)
SELECT
  w.job_key,
  w.group_id,
  w.master_job_key,
  w.member_rank = 1 AS is_master,
  w.member_rank,
  m.master_rank,
  w.board_id,
  w.source,
  w.url,
  w.country_iso2
FROM with_master w
JOIN masters m ON m.master_job_key = w.master_job_key;

SELECT
  COUNT(*) AS rows_n,
  COUNTIF(is_master) AS masters,
  COUNTIF(NOT is_master) AS collapsed,
  COUNT(DISTINCT board_id) AS board_ids,
  COUNT(DISTINCT IF(NOT is_master, group_id, NULL)) AS multi_groups
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offer_boards`;

END;
