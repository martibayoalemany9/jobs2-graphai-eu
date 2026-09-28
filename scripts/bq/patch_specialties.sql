-- Re-tag serving specialties: occupation clusters + uncategorized fallback.
-- Does not rebuild job_key / public_rank.

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
  ('social','social worker'), ('social','social work'), ('social','caseworker'),
  ('medicine','physician'), ('medicine','medical doctor'), ('medicine','facharzt'),
  ('medicine','assistenzarzt'), ('medicine','approbation'), ('medicine','allgemeinmedizi'),
  ('neurology','neurolog'), ('neurology','neurology'),
  ('chemistry','chemist'), ('chemistry','chemiker'), ('chemistry','chartered chemist'),
  ('science','research scientist'), ('science','laboratory scientist'), ('science','chartered scientist'),
  ('research','clinical research'), ('research','wissenschaftlicher mitarbeiter'), ('research','postdoc'),
  ('management','geschäftsführer'), ('management','general manager'), ('management','betriebsleiter'),
  ('public','civil servant'), ('public','öffentlicher dienst'), ('public','oeffentlicher dienst'),
  ('public','public sector'),
  ('finance','financial analyst'), ('finance','investment analyst'), ('finance','portfolio manager'),
  ('actuary','actuary'), ('actuary','aktuar'), ('actuary','actuarial'),
  ('aeronautics','avionics'), ('aeronautics','aircraft mechanic'), ('aeronautics','airline pilot'),
  ('aeronautics','luftfahrt'),
  ('automotive','automotive'), ('automotive','kfz-mechatroniker'), ('automotive','autosar'),
  ('electricity','electrician'), ('electricity','elektriker'), ('electricity','elektrofachkraft'),
  ('telecom','telecommunications'), ('telecom','telekommunikation'), ('telecom','network engineer'),
  ('hardware','hardware engineer'), ('hardware','fpga engineer'), ('hardware','asic engineer'),
  ('nanotech','nanotechnology'), ('nanotech','nanoscience'), ('nanotech','nanomaterial'),
  ('quantum','quantum computing'), ('quantum','qiskit'), ('quantum','quantum physicist'),
  ('bizdev','business development'), ('bizdev','account executive'),
  ('bi','business intelligence'), ('bi','power bi'), ('bi','tableau'),
  ('bizanalysis','business analyst'), ('bizanalysis','requirements engineer'),
  ('product','product manager'), ('product','product owner'),
  ('project','project manager'), ('project','projektleiter')
]);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country_tmp`
CLUSTER BY country_iso2, public_rank AS
SELECT
  j.* EXCEPT (specialties),
  IFNULL(s.specialties, ['uncategorized']) AS specialties
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j
LEFT JOIN (
  SELECT
    j2.job_key,
    ARRAY_AGG(DISTINCT n.id) AS specialties
  FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country` j2
  JOIN `poetic-sentinel-402405.apply_jobs_jobs2_prod.specialty_needles` n
    ON STRPOS(LOWER(CONCAT(IFNULL(j2.title, ""), " ", IFNULL(j2.description_excerpt, ""))), n.needle) > 0
  GROUP BY j2.job_key
) s USING (job_key);

CREATE OR REPLACE TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country`
CLUSTER BY country_iso2, public_rank AS
SELECT * FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country_tmp`;

DROP TABLE `poetic-sentinel-402405.apply_jobs_jobs2_prod.job_offers_country_tmp`;

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

SELECT specialty, SUM(n_total) AS n
FROM `poetic-sentinel-402405.apply_jobs_jobs2_prod.country_specialty_counts`
WHERE as_of = CURRENT_DATE()
GROUP BY specialty
ORDER BY n DESC;
