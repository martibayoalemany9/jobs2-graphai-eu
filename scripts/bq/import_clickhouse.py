#!/usr/bin/env python3
"""Import ClickHouse graphai.jobs_skill_certs + jobs_* into BigQuery, filtering duplicates.

Certs → apply_jobs_jobs2_prod.skill_certs_imported (replace unique skill_id+uri)
     → apply_jobs.certification_catalog (MERGE-insert unique cert_id / url)
Jobs → apply_jobs.job_offers (MERGE-insert unique normalized URL, source=jobs_crawling_* / jobs_silver / jobs_listings)

ClickHouse Cloud IP allow-list often resets TLS (UNEXPECTED_EOF / SSL_ERROR_SYSCALL).
When CH is unreachable, load recrawl JSONL + jobs.graphai.eu studio skill courses.
Never inserts synthetic studio ROLE_SETS jobs into harvest.
"""
from __future__ import annotations

import base64
import csv
import json
import os
import re
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT = "poetic-sentinel-402405"
HARVEST = f"{PROJECT}.apply_jobs"
SERVING = f"{PROJECT}.{os.environ.get('BQ_DATASET', 'apply_jobs_jobs2_prod')}"
EU10K = Path(
    os.environ.get(
        "EU10K",
        "/Users/username/Desktop/Sorted_Documents/01_Job_Applications/Campaigns/application_run_20260925_de_data/eu10k",
    )
)
STUDIO = Path("/Users/username/jobs-graphai-eu/public/studio.json")
SKILLS_JS = Path("/Users/username/jobs-graphai-eu/lib/skills-catalog.js")
RECRAWL = Path(os.environ.get("SKILL_CERTS_JSONL", "/tmp/jobs_skill_certs.jsonl"))
JOBS_JSONL = Path(os.environ.get("CH_JOBS_JSONL", "/tmp/ch_jobs_recrawl.jsonl"))
CERT_CSV = Path("/tmp/ch_skill_certs.csv")
CAT_JSONL = Path("/tmp/ch_certification_catalog.jsonl")
JOBS_CSV = Path("/tmp/ch_jobs.csv")
JOB_FIELDS = [
    "company",
    "title",
    "job_location",
    "headquarters_location",
    "is_remote",
    "country",
    "url",
    "appeared_at",
    "source",
    "description",
]
CERT_FIELDS = [
    "skill_id",
    "skill_name",
    "level",
    "provider",
    "name",
    "uri",
    "source_url",
    "imported_at",
]
UA = "Mozilla/5.0 Graphai clickhouse-import/1.0"

KNOWN_CERT_URLS = {
    "aws-saa": "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    "aws-developer": "https://aws.amazon.com/certification/certified-developer-associate/",
    "aws": "https://aws.amazon.com/certification/",
    "gcp": "https://cloud.google.com/learn/certification",
    "azure": "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
    "cissp": "https://www.isc2.org/certifications/cissp",
    "cism": "https://www.isaca.org/credentialing/cism",
    "oscp": "https://www.offsec.com/courses/pen-200/",
    "ceh": "https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/",
    "comptia-sec": "https://www.comptia.org/certifications/security",
    "comptia-net": "https://www.comptia.org/certifications/network",
    "cka": "https://www.cncf.io/training/certification/cka/",
    "ckad": "https://www.cncf.io/training/certification/ckad/",
    "ccna": "https://www.cisco.com/site/us/en/learn/training-certifications/certifications/ccna/index.html",
    "pmp": "https://www.pmi.org/certifications/project-management-pmp",
    "scrum": "https://www.scrum.org/professional-scrum-certifications",
    "itil": "https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1",
    "iso27001": "https://www.iso.org/standard/27001",
}


def load_env() -> None:
    env_path = Path.home() / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(errors="replace").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(text or "").lower()).strip("-")
    return (s or "cert")[:80]


def ch_query(sql: str, timeout: int = 90):
    host = os.environ.get("CLICKHOUSE_HOST", "b23f71a4si.europe-west2.gcp.clickhouse.cloud")
    port = os.environ.get("CLICKHOUSE_PORT", "8443")
    user = os.environ.get("CLICKHOUSE_SQL_USER", "default")
    password = (
        os.environ.get("CLICKHOUSE_DEFAULT_PASSWORD")
        or os.environ.get("CLICKHOUSE_PASSWORD")
        or os.environ.get("CLICKHOUSE_SECRET")
        or ""
    )
    url = f"https://{host}:{port}/?database={os.environ.get('CLICKHOUSE_DATABASE', 'default')}"
    req = urllib.request.Request(
        url,
        data=sql.encode(),
        method="POST",
        headers={
            "Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode(),
            "Content-Type": "text/plain; charset=utf-8",
            "User-Agent": UA,
        },
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        raw = resp.read().decode("utf-8", "replace")
    if not raw.strip():
        return []
    if sql.strip().upper().endswith("JSONEACHROW") or "FORMAT JSONEachRow" in sql:
        rows = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
        return rows
    payload = json.loads(raw)
    return payload.get("data") or []


def fetch_ch_certs() -> list[dict]:
    sql = """
    SELECT skill_id, skill_name, level, provider, name, uri, source_url
    FROM graphai.jobs_skill_certs FINAL
    WHERE uri != '' AND name != ''
    FORMAT JSONEachRow
    """
    return ch_query(sql, timeout=120)


def fetch_ch_jobs() -> list[dict]:
    jobs: list[dict] = []
    jobs.extend(
        ch_query(
            """
            SELECT
              company,
              title,
              location AS job_location,
              if(job_url != '', job_url, apply_url) AS url,
              toString(crawled_at) AS appeared_at,
              concat('jobs_crawling_', ats) AS source,
              substring(content, 1, 4000) AS description
            FROM graphai.jobs_crawling FINAL
            WHERE if(job_url != '', job_url, apply_url) != ''
            FORMAT JSONEachRow
            """,
            timeout=180,
        )
    )
    jobs.extend(
        ch_query(
            """
            SELECT
              company,
              job_title AS title,
              location AS job_location,
              job_url AS url,
              toString(observed_at) AS appeared_at,
              concat('jobs_silver_', source) AS source,
              substring(description, 1, 4000) AS description
            FROM graphai.jobs_silver_jobs FINAL
            WHERE job_url != ''
            FORMAT JSONEachRow
            """,
            timeout=180,
        )
    )
    jobs.extend(
        ch_query(
            """
            SELECT
              company,
              job_title AS title,
              '' AS job_location,
              job_url AS url,
              toString(at) AS appeared_at,
              concat('jobs_listings_', source) AS source,
              '' AS description
            FROM graphai.jobs_listings
            WHERE job_url != ''
            FORMAT JSONEachRow
            """,
            timeout=120,
        )
    )
    return jobs


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(rec, dict):
            rows.append(rec)
    return rows


def load_studio_courses() -> list[dict]:
    if not STUDIO.exists():
        return []
    data = json.loads(STUDIO.read_text(encoding="utf-8"))
    out = []
    for skill_id, skill in (data.get("skills") or {}).items():
        name = skill.get("name") or skill_id
        for c in skill.get("courses") or []:
            uri = c.get("url") or ""
            title = c.get("title") or ""
            if not uri or not title:
                continue
            level = "beginner" if re.search(
                r"everybody|intro|essentials|beginner|fundamentals|get started",
                title,
                re.I,
            ) else "advanced"
            out.append(
                {
                    "skill_id": skill_id,
                    "skill_name": name,
                    "level": level,
                    "provider": c.get("provider") or "catalog",
                    "name": title,
                    "uri": uri,
                    "source_url": "https://jobs.graphai.eu",
                }
            )
        out.append(
            {
                "skill_id": skill_id,
                "skill_name": name,
                "level": "beginner",
                "provider": "Google Skills",
                "name": f"{name} · beginner catalog",
                "uri": "https://www.skills.google/catalog?keywords=" + urllib.request.quote(f"{name} beginner"),
                "source_url": "https://jobs.graphai.eu",
            }
        )
        out.append(
            {
                "skill_id": skill_id,
                "skill_name": name,
                "level": "advanced",
                "provider": "Google Skills",
                "name": f"{name} · advanced catalog",
                "uri": "https://www.skills.google/catalog?keywords=" + urllib.request.quote(f"{name} professional"),
                "source_url": "https://jobs.graphai.eu",
            }
        )
    return out


def load_known_certs() -> list[dict]:
    text = SKILLS_JS.read_text(encoding="utf-8") if SKILLS_JS.exists() else ""
    rows = []
    for m in re.finditer(
        r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*needles:\s*\[([^\]]+)\]',
        text,
    ):
        cid, name, needles_raw = m.group(1), m.group(2), m.group(3)
        rows.append(
            {
                "skill_id": cid,
                "skill_name": name,
                "level": "advanced",
                "provider": name.split()[0] if name else "catalog",
                "name": name,
                "uri": KNOWN_CERT_URLS.get(cid, f"https://jobs.graphai.eu/?cert={cid}"),
                "source_url": "https://jobs.graphai.eu",
                "cert_id": cid,
                "needles": [n.strip().strip('"').strip("'") for n in needles_raw.split(",") if n.strip()],
            }
        )
    return rows


def normalize_cert(r: dict, now: str) -> dict | None:
    uri = str(r.get("uri") or r.get("url") or "").strip()
    name = str(r.get("name") or r.get("title") or "").strip()
    if not uri or not name or not uri.startswith("http"):
        return None
    level = str(r.get("level") or "beginner").lower()
    if "advanc" in level or "pro" in level:
        level = "advanced"
    else:
        level = "beginner"
    return {
        "skill_id": str(r.get("skill_id") or r.get("id") or "")[:80],
        "skill_name": str(r.get("skill_name") or "")[:120],
        "level": level,
        "provider": str(r.get("provider") or "Google Skills")[:80],
        "name": name[:240],
        "uri": uri[:500],
        "source_url": str(r.get("source_url") or "")[:500],
        "imported_at": now,
        "cert_id": str(r.get("cert_id") or "")[:80],
        "needles": r.get("needles") or [],
    }


def dedupe_certs(rows: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in rows:
        key = (r["skill_id"].lower(), r["uri"].split("?")[0].rstrip("/").lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def country_of(loc: str, company: str, url: str) -> str:
    blob = f"{loc} {company} {url}".lower()
    if any(x in blob for x in (".nl", "netherlands", "nederland")):
        return "NL"
    if any(x in blob for x in (".cz", "czechia", "czech")):
        return "CZ"
    if any(x in blob for x in ("united kingdom", ".uk", "london")):
        return "GB"
    if any(x in blob for x in ("switzerland", ".ch", "zürich", "zurich")):
        return "CH"
    if any(x in blob for x in ("austria", "österreich", "wien")):
        return "AT"
    if any(x in blob for x in ("united states", ".us", "new york", "san francisco")):
        return "US"
    return "DE"


def normalize_job(r: dict) -> dict | None:
    url = str(r.get("url") or r.get("job_url") or "").strip()
    title = str(r.get("title") or r.get("job_title") or "").strip()
    if not url.startswith("http") or not title:
        return None
    loc = str(r.get("job_location") or r.get("location") or "").strip() or "default"
    company = str(r.get("company") or "")[:200]
    remote = "true" if re.search(r"\b(remote|homeoffice|wfh)\b", f"{title} {loc}", re.I) else "false"
    return {
        "company": company,
        "title": title[:240],
        "job_location": loc[:200],
        "headquarters_location": loc[:200],
        "is_remote": remote,
        "country": country_of(loc, company, url),
        "url": url.split("#")[0][:500],
        "appeared_at": str(r.get("appeared_at") or "")[:40],
        "source": str(r.get("source") or "jobs_crawling")[:80],
        "description": str(r.get("description") or "").replace("\n", " ")[:4000],
    }


def dedupe_jobs(rows: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in rows:
        key = r["url"].split("?")[0].rstrip("/").lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def bq_load_csv(table: str, path: Path, schema: str) -> None:
    cmd = [
        "bq", "load", f"--project_id={PROJECT}", "--location=EU",
        "--replace", "--source_format=CSV", "--skip_leading_rows=1", "--allow_quoted_newlines",
        f"--schema={schema}",
        table, str(path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    print("LOAD", table, r.returncode, (r.stderr or r.stdout or "")[-400:], flush=True)
    if r.returncode != 0:
        raise SystemExit(f"load failed {table}")


def bq_query(sql: str, timeout: int = 300) -> str:
    r = subprocess.run(
        ["bq", "query", f"--project_id={PROJECT}", "--location=EU", "--use_legacy_sql=false", "--format=pretty", sql],
        capture_output=True, text=True, timeout=timeout,
    )
    out = (r.stdout or r.stderr or "")[-600:]
    print("QUERY", r.returncode, out, flush=True)
    return out


def write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def catalog_rows(certs: list[dict]) -> list[dict]:
    out = []
    seen = set()
    for c in certs:
        cid = c.get("cert_id") or slug(f"{c['provider']}-{c['name']}")
        if cid in seen:
            continue
        seen.add(cid)
        needles = c.get("needles") or [c["name"]]
        mention = "|".join(re.escape(n.lower()) for n in needles if n)
        out.append(
            {
                "cert_id": cid[:80],
                "certification_name": c["name"][:200],
                "provider": c["provider"][:80],
                "certification_url": c["uri"][:500],
                "mention_regex": mention[:500] or re.escape(c["name"].lower())[:500],
                "skill_regex": (c["skill_id"] or slug(c["name"]))[:200],
            }
        )
    return out


def import_certs(certs: list[dict]) -> None:
    if not certs:
        print("no certs", flush=True)
        return
    write_csv(CERT_CSV, CERT_FIELDS, certs)
    staging = f"{HARVEST}.skill_certs_imported_staging"
    bq_load_csv(
        staging,
        CERT_CSV,
        "skill_id:STRING,skill_name:STRING,level:STRING,provider:STRING,name:STRING,uri:STRING,source_url:STRING,imported_at:TIMESTAMP",
    )
    bq_query(
        f"""
CREATE OR REPLACE TABLE `{SERVING}.skill_certs_imported`
CLUSTER BY skill_id AS
SELECT skill_id, skill_name, level, provider, name, uri, source_url, imported_at
FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY LOWER(skill_id), LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(uri), r"[?#].*$", ""), r"/+$", ""))
    ORDER BY imported_at DESC
  ) rn
  FROM `{staging}`
  WHERE uri IS NOT NULL AND uri != '' AND name IS NOT NULL AND name != ''
)
WHERE rn = 1
"""
    )
    cats = catalog_rows(certs)
    with CAT_JSONL.open("w", encoding="utf-8") as f:
        for row in cats:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    subprocess.run(
        [
            "bq", "load", f"--project_id={PROJECT}", "--location=EU", "--replace",
            "--source_format=NEWLINE_DELIMITED_JSON",
            f"{HARVEST}.certification_catalog_staging",
            str(CAT_JSONL),
            "cert_id:STRING,certification_name:STRING,provider:STRING,certification_url:STRING,mention_regex:STRING,skill_regex:STRING",
        ],
        check=False, timeout=180,
    )
    bq_query(
        f"""
CREATE OR REPLACE TABLE `{HARVEST}.certification_catalog_staging_new` AS
SELECT S.*
FROM `{HARVEST}.certification_catalog_staging` S
WHERE NOT EXISTS (
  SELECT 1 FROM `{HARVEST}.certification_catalog` T WHERE T.cert_id = S.cert_id
)
AND (
  IFNULL(S.certification_url,"") = ""
  OR NOT EXISTS (
    SELECT 1 FROM `{HARVEST}.certification_catalog` T
    WHERE LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(T.certification_url,"")), r"[?#].*$", ""), r"/+$", ""))
        = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(S.certification_url,"")), r"[?#].*$", ""), r"/+$", ""))
      AND IFNULL(T.certification_url,"") != ""
  )
)
"""
    )
    bq_query(
        f"""
MERGE `{HARVEST}.certification_catalog` T
USING `{HARVEST}.certification_catalog_staging_new` S
ON T.cert_id = S.cert_id
WHEN NOT MATCHED THEN INSERT
  (cert_id, certification_name, provider, certification_url, mention_regex, skill_regex)
VALUES
  (S.cert_id, S.certification_name, S.provider, S.certification_url, S.mention_regex, S.skill_regex)
"""
    )


def import_jobs(jobs: list[dict]) -> None:
    if not jobs:
        print("no CH jobs", flush=True)
        return
    write_csv(JOBS_CSV, JOB_FIELDS, jobs)
    EU10K.mkdir(parents=True, exist_ok=True)
    sidecar = EU10K / "jobs_clickhouse.csv"
    sidecar.write_bytes(JOBS_CSV.read_bytes())
    staging = f"{HARVEST}.job_offers_staging_ch"
    bq_load_csv(
        staging,
        JOBS_CSV,
        "company:STRING,title:STRING,job_location:STRING,headquarters_location:STRING,is_remote:STRING,country:STRING,url:STRING,appeared_at:STRING,source:STRING,description:STRING",
    )
    bq_query(
        f"""
MERGE `{HARVEST}.job_offers` T
USING `{staging}` S
ON LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(T.url,"")), r"[?#].*$", ""), r"/+$", ""))
 = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(S.url,"")), r"[?#].*$", ""), r"/+$", ""))
WHEN NOT MATCHED THEN INSERT
  (company, title, job_location, headquarters_location, is_remote, country, url, appeared_at, source, description)
VALUES
  (S.company, S.title, S.job_location, S.headquarters_location, S.is_remote, S.country, S.url, S.appeared_at, S.source, S.description)
""",
        timeout=300,
    )


def main() -> int:
    load_env()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    certs: list[dict] = []
    jobs: list[dict] = []
    ch_ok = False
    try:
        raw_certs = fetch_ch_certs()
        print("clickhouse certs", len(raw_certs), flush=True)
        certs.extend(raw_certs)
        ch_ok = True
    except Exception as e:
        print("clickhouse certs fail", type(e).__name__, str(e)[:200], flush=True)
    try:
        raw_jobs = fetch_ch_jobs()
        print("clickhouse jobs", len(raw_jobs), flush=True)
        jobs.extend(raw_jobs)
        ch_ok = True
    except Exception as e:
        print("clickhouse jobs fail", type(e).__name__, str(e)[:200], flush=True)

    recrawl = load_jsonl(RECRAWL)
    print("recrawl jsonl", len(recrawl), flush=True)
    recrawl_jobs = load_jsonl(JOBS_JSONL)
    print("recrawl jobs jsonl", len(recrawl_jobs), flush=True)
    jobs.extend(recrawl_jobs)
    studio = load_studio_courses()
    print("studio courses", len(studio), flush=True)
    known = load_known_certs()
    print("known certs", len(known), flush=True)

    normed = []
    for r in certs + recrawl + studio + known:
        n = normalize_cert(r, now)
        if n:
            normed.append(n)
    certs_u = dedupe_certs(normed)
    print("certs unique", len(certs_u), "ch_ok", ch_ok, flush=True)
    import_certs(certs_u)

    jobs_u = dedupe_jobs([j for j in (normalize_job(r) for r in jobs) if j])
    print("jobs unique", len(jobs_u), flush=True)
    import_jobs(jobs_u)

    counts = bq_query(
        f"""
SELECT 'skill_certs_imported' t, COUNT(*) n FROM `{SERVING}.skill_certs_imported`
UNION ALL SELECT 'certification_catalog', COUNT(*) FROM `{HARVEST}.certification_catalog`
UNION ALL SELECT 'job_offers_ch', COUNT(*) FROM `{HARVEST}.job_offers`
  WHERE STARTS_WITH(source, 'jobs_crawling_') OR STARTS_WITH(source, 'jobs_silver_') OR STARTS_WITH(source, 'jobs_listings_')
"""
    )
    print("DONE", counts, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
