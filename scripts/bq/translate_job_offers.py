#!/usr/bin/env python3
"""Translate unique job titles into catalog locales and MERGE into BigQuery.

Writes sibling tables (never UPDATE/DELETE harvest apply_jobs.job_offers):
  apply_jobs.job_title_translations
  apply_jobs.job_offer_translations
  apply_jobs_jobs2_prod.job_title_translations
  apply_jobs_jobs2_prod.job_offer_translations
  apply_jobs_jobs2_dev copies of the title cache + per-job rows

Glossary first; Cloud Translation API for remaining frequent titles.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from job_title_glossary import LOCALES, apply_glossary, detect_lang, strip_gender

PROJECT = os.environ.get("BQ_PROJECT", "poetic-sentinel-402405")
HARVEST = f"{PROJECT}.apply_jobs"
SERVING = f"{PROJECT}.{os.environ.get('BQ_DATASET', 'apply_jobs_jobs2_prod')}"
DEV = f"{PROJECT}.apply_jobs_jobs2_dev"
BQ_LOCATION = "EU"


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd[:8]), "..." if len(cmd) > 8 else "")
    return subprocess.run(cmd, check=check, text=True, capture_output=False)


def bq_query(sql: str, fmt: str = "prettyjson", max_rows: int = 1000000, capture: bool = True) -> str:
    path = Path("/tmp/jobs2_i18n_query.sql")
    path.write_text(sql, encoding="utf-8")
    cmd = [
        "bq", "query",
        f"--project_id={PROJECT}",
        f"--location={BQ_LOCATION}",
        "--use_legacy_sql=false",
        "--nouse_legacy_sql",
        f"--format={fmt}",
        f"--max_rows={max_rows}",
    ]
    proc = subprocess.run(cmd, check=True, text=True, capture_output=capture, stdin=path.open())
    return proc.stdout or ""


def access_token() -> str:
    proc = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        check=True, text=True, capture_output=True,
    )
    return proc.stdout.strip()


def ensure_tables() -> None:
    ddl = r"""
CREATE TABLE IF NOT EXISTS `{harvest}.job_title_translations` (
  source_title STRING NOT NULL,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, source_title;

CREATE TABLE IF NOT EXISTS `{harvest}.job_offer_translations` (
  job_key STRING NOT NULL,
  url STRING,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  source_title STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, job_key;

CREATE TABLE IF NOT EXISTS `{serving}.job_title_translations` (
  source_title STRING NOT NULL,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, source_title;

CREATE TABLE IF NOT EXISTS `{serving}.job_offer_translations` (
  job_key STRING NOT NULL,
  url STRING,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  source_title STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, job_key;

CREATE TABLE IF NOT EXISTS `{serving}.job_offer_correction_requests` (
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
CLUSTER BY job_key;

CREATE TABLE IF NOT EXISTS `{dev}.job_title_translations` (
  source_title STRING NOT NULL,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, source_title;

CREATE TABLE IF NOT EXISTS `{dev}.job_offer_translations` (
  job_key STRING NOT NULL,
  url STRING,
  locale STRING NOT NULL,
  title STRING,
  excerpt STRING,
  source_title STRING,
  method STRING,
  translated_at TIMESTAMP
)
CLUSTER BY locale, job_key;
""".format(harvest=HARVEST, serving=SERVING, dev=DEV)
    bq_query(ddl, fmt="csv")
    print("tables ready")


def grant_iam() -> None:
    grants = [
        f'GRANT `roles/bigquery.dataEditor` ON TABLE `{SERVING}.job_offer_correction_requests` TO "serviceAccount:jobs2-web@poetic-sentinel-402405.iam.gserviceaccount.com"',
        f'GRANT `roles/bigquery.dataViewer` ON TABLE `{SERVING}.job_offer_translations` TO "serviceAccount:jobs2-web@poetic-sentinel-402405.iam.gserviceaccount.com"',
        f'GRANT `roles/bigquery.dataViewer` ON TABLE `{SERVING}.job_title_translations` TO "serviceAccount:jobs2-web@poetic-sentinel-402405.iam.gserviceaccount.com"',
        f'GRANT `roles/bigquery.dataViewer` ON TABLE `{DEV}.job_offer_translations` TO "serviceAccount:jobs2-web-dev@poetic-sentinel-402405.iam.gserviceaccount.com"',
    ]
    for sql in grants:
        try:
            bq_query(sql, fmt="csv")
        except subprocess.CalledProcessError as e:
            print("iam grant skipped", sql[:80], e)
    print("iam grant pass done")


def fetch_titles(min_count: int) -> list[dict]:
    sql = f"""
SELECT title, COUNT(*) AS n,
       ANY_VALUE(SUBSTR(IFNULL(description_excerpt, ''), 1, 400)) AS excerpt
FROM `{SERVING}.job_offers_country`
WHERE title IS NOT NULL AND title != ''
GROUP BY title
HAVING n >= {int(min_count)}
ORDER BY n DESC
"""
    try:
        from google.cloud import bigquery
        client = bigquery.Client(project=PROJECT, location=BQ_LOCATION)
        job = client.query(sql, location=BQ_LOCATION)
        rows = []
        for r in job:
            rows.append({
                "title": r["title"] or "",
                "n": int(r["n"] or 0),
                "excerpt": r["excerpt"] or "",
            })
        print("unique titles n>=%s:" % min_count, len(rows), "jobs", sum(x["n"] for x in rows))
        return rows
    except Exception as e:
        print("bigquery client fetch failed, using bq cli", e)
        raw = bq_query(sql)
        parsed = json.loads(raw) if raw.strip() else []
        rows = []
        for r in parsed:
            rows.append({
                "title": r.get("title") or "",
                "n": int(r.get("n") or 0),
                "excerpt": r.get("excerpt") or "",
            })
        print("unique titles n>=%s:" % min_count, len(rows), "jobs", sum(x["n"] for x in rows))
        return rows


def translate_batch(texts: list[str], target: str, token: str) -> list[str]:
    body = json.dumps({"q": texts, "target": target, "format": "text"}).encode("utf-8")
    req = urllib.request.Request(
        "https://translation.googleapis.com/language/translate/v2",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "x-goog-user-project": PROJECT,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    translations = payload.get("data", {}).get("translations") or []
    if len(translations) != len(texts):
        raise RuntimeError("translate size mismatch %s != %s" % (len(translations), len(texts)))
    return [t.get("translatedText") or src for t, src in zip(translations, texts)]


def enable_translate() -> None:
    subprocess.run(
        ["gcloud", "services", "enable", "translate.googleapis.com", f"--project={PROJECT}"],
        check=False,
    )


def build_rows(titles: list[dict], max_chars: int, glossary_only: bool) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    out: list[dict] = []
    need_api: list[dict] = []
    glossary_jobs = 0
    for row in titles:
        src = row["title"]
        src_lang = detect_lang(src)
        stripped = strip_gender(src)
        excerpt = row.get("excerpt") or ""
        per_locale: dict[str, tuple[str, str]] = {}
        all_glossary = True
        for loc in LOCALES:
            text, method, covered = apply_glossary(src, loc)
            if covered:
                per_locale[loc] = (text, "glossary" if loc != src_lang else "identity")
            elif loc == src_lang:
                per_locale[loc] = (stripped, "identity")
            else:
                all_glossary = False
                per_locale[loc] = (text if method != "none" else stripped, method)
        if all_glossary or glossary_only:
            glossary_jobs += row["n"]
            for loc, (text, method) in per_locale.items():
                out.append({
                    "source_title": src,
                    "locale": loc,
                    "title": text,
                    "excerpt": "",
                    "method": method,
                    "translated_at": now,
                    "n": row["n"],
                    "excerpt_src": excerpt,
                })
        else:
            need_api.append({"row": row, "src_lang": src_lang, "stripped": stripped, "excerpt": excerpt})

    print("glossary-complete titles", len(titles) - len(need_api), "jobs", glossary_jobs, "api-candidates", len(need_api))
    if glossary_only or not need_api:
        return out

    # Translate remaining titles by descending n until char budget.
    token = None
    used_chars = 0
    api_ok = 0
    api_fail = 0
    by_target: dict[str, list[dict]] = {loc: [] for loc in LOCALES}
    for item in need_api:
        src = item["row"]["title"]
        stripped = item["stripped"]
        for loc in LOCALES:
            if loc == item["src_lang"]:
                continue
            chars = len(stripped)
            if used_chars + chars > max_chars:
                continue
            used_chars += chars
            by_target[loc].append(item)
    print("planned translate chars", used_chars, "of", max_chars)

    try:
        token = access_token()
    except Exception as e:
        print("no access token, glossary only leftover", e)
        token = None

    translated: dict[tuple[str, str], str] = {}
    if token:
        enable_translate()
        for loc, items in by_target.items():
            # unique stripped texts
            uniq = []
            seen = set()
            for it in items:
                s = it["stripped"]
                if s in seen:
                    continue
                seen.add(s)
                uniq.append(s)
            if not token:
                break
            print("translate", loc, "unique", len(uniq))
            for i in range(0, len(uniq), 128):
                if not token:
                    break
                chunk = uniq[i:i + 128]
                for attempt in range(4):
                    try:
                        got = translate_batch(chunk, loc, token)
                        for src, dst in zip(chunk, got):
                            translated[(src, loc)] = dst
                        api_ok += len(chunk)
                        break
                    except urllib.error.HTTPError as e:
                        body = e.read().decode("utf-8", "replace")[:400]
                        print("translate http", e.code, body)
                        if e.code == 401 and attempt == 0:
                            token = access_token()
                            continue
                        if e.code == 403:
                            print("translate API forbidden; remaining titles keep source/glossary")
                            token = None
                            api_fail += len(chunk)
                            break
                        if e.code == 429:
                            time.sleep(2 ** attempt)
                            continue
                        api_fail += len(chunk)
                        break
                    except Exception as e:
                        print("translate err", e)
                        time.sleep(1 + attempt)
                        if attempt == 3:
                            api_fail += len(chunk)
            time.sleep(0.05)
    print("api titles ok", api_ok, "fail", api_fail)

    for item in need_api:
        src = item["row"]["title"]
        stripped = item["stripped"]
        excerpt = item["excerpt"]
        src_lang = item["src_lang"]
        for loc in LOCALES:
            if (stripped, loc) in translated:
                text, method = translated[(stripped, loc)], "translate"
            else:
                text, method, covered = apply_glossary(src, loc)
                if loc == src_lang:
                    text, method = (text if covered else stripped), "identity"
                elif not covered:
                    text = stripped
                    method = method if method != "none" else "source"
            out.append({
                "source_title": src,
                "locale": loc,
                "title": text,
                "excerpt": "",
                "method": method,
                "translated_at": now,
                "n": item["row"]["n"],
                "excerpt_src": excerpt,
            })
    return out


def write_jsonl(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps({
                "source_title": r["source_title"],
                "locale": r["locale"],
                "title": r["title"],
                "excerpt": r.get("excerpt") or "",
                "method": r["method"],
                "translated_at": r["translated_at"],
            }, ensure_ascii=False) + "\n")
    print("wrote", path, "rows", len(rows))


def load_and_expand(jsonl: Path) -> None:
    staging_id = f"{PROJECT}:{SERVING.split('.', 1)[-1]}.job_title_translations_staging"
    staging = f"{SERVING}.job_title_translations_staging"
    run([
        "bq", "load",
        f"--project_id={PROJECT}",
        f"--location={BQ_LOCATION}",
        "--source_format=NEWLINE_DELIMITED_JSON",
        "--replace",
        staging_id,
        str(jsonl),
        "source_title:STRING,locale:STRING,title:STRING,excerpt:STRING,method:STRING,translated_at:TIMESTAMP",
    ])
    merge_cache = f"""
MERGE `{SERVING}.job_title_translations` T
USING `{staging}` S
ON T.source_title = S.source_title AND T.locale = S.locale
WHEN MATCHED THEN UPDATE SET
  title = S.title, excerpt = S.excerpt, method = S.method, translated_at = S.translated_at
WHEN NOT MATCHED THEN INSERT (source_title, locale, title, excerpt, method, translated_at)
VALUES (S.source_title, S.locale, S.title, S.excerpt, S.method, S.translated_at);

MERGE `{HARVEST}.job_title_translations` T
USING `{staging}` S
ON T.source_title = S.source_title AND T.locale = S.locale
WHEN MATCHED THEN UPDATE SET
  title = S.title, excerpt = S.excerpt, method = S.method, translated_at = S.translated_at
WHEN NOT MATCHED THEN INSERT (source_title, locale, title, excerpt, method, translated_at)
VALUES (S.source_title, S.locale, S.title, S.excerpt, S.method, S.translated_at);
"""
    bq_query(merge_cache, fmt="csv")
    print("title cache merged")

    expand_serving = f"""
MERGE `{SERVING}.job_offer_translations` T
USING (
  SELECT j.job_key, j.url, c.locale, c.title, c.excerpt, j.title AS source_title, c.method,
         CURRENT_TIMESTAMP() AS translated_at
  FROM `{SERVING}.job_offers_country` j
  JOIN `{SERVING}.job_title_translations` c
    ON c.source_title = j.title
) S
ON T.job_key = S.job_key AND T.locale = S.locale
WHEN MATCHED THEN UPDATE SET
  url = S.url, title = S.title, excerpt = S.excerpt, source_title = S.source_title,
  method = S.method, translated_at = S.translated_at
WHEN NOT MATCHED THEN INSERT (job_key, url, locale, title, excerpt, source_title, method, translated_at)
VALUES (S.job_key, S.url, S.locale, S.title, S.excerpt, S.source_title, S.method, S.translated_at);
"""
    bq_query(expand_serving, fmt="csv")
    print("serving job_offer_translations expanded")

    expand_harvest = f"""
MERGE `{HARVEST}.job_offer_translations` T
USING (
  SELECT TRANSLATE(TO_BASE64(SUBSTR(SHA256(
           LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(IFNULL(j.url, "")), r"[?#].*$", ""), r"/+$", ""))
         ), 1, 18)), '+/', '-_') AS job_key,
         j.url, c.locale, c.title, c.excerpt, j.title AS source_title, c.method,
         CURRENT_TIMESTAMP() AS translated_at
  FROM `{HARVEST}.job_offers` j
  JOIN `{HARVEST}.job_title_translations` c
    ON c.source_title = j.title
) S
ON T.job_key = S.job_key AND T.locale = S.locale
WHEN MATCHED THEN UPDATE SET
  url = S.url, title = S.title, excerpt = S.excerpt, source_title = S.source_title,
  method = S.method, translated_at = S.translated_at
WHEN NOT MATCHED THEN INSERT (job_key, url, locale, title, excerpt, source_title, method, translated_at)
VALUES (S.job_key, S.url, S.locale, S.title, S.excerpt, S.source_title, S.method, S.translated_at);
"""
    bq_query(expand_harvest, fmt="csv")
    print("harvest job_offer_translations expanded")

    try:
        run([
            "bq", "--location=EU", "cp", "--force",
            f"{PROJECT}:apply_jobs_jobs2_prod.job_title_translations",
            f"{PROJECT}:apply_jobs_jobs2_dev.job_title_translations",
        ], check=False)
        run([
            "bq", "--location=EU", "cp", "--force",
            f"{PROJECT}:apply_jobs_jobs2_prod.job_offer_translations",
            f"{PROJECT}:apply_jobs_jobs2_dev.job_offer_translations",
        ], check=False)
    except Exception as e:
        print("dev copy", e)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-count", type=int, default=1, help="unique titles with at least this many jobs")
    ap.add_argument("--max-chars", type=int, default=1_500_000, help="Cloud Translate character budget")
    ap.add_argument("--glossary-only", action="store_true")
    ap.add_argument("--skip-expand", action="store_true")
    ap.add_argument("--from-jsonl", default="", help="skip translate and load this JSONL")
    args = ap.parse_args()

    ensure_tables()
    grant_iam()
    jsonl = Path(args.from_jsonl or "/tmp/job_title_translations.jsonl")
    if args.from_jsonl:
        if not jsonl.exists():
            print("missing", jsonl)
            return 1
        print("loading existing", jsonl)
    else:
        titles = fetch_titles(args.min_count)
        if not titles:
            print("no titles")
            return 1
        rows = build_rows(titles, args.max_chars, args.glossary_only)
        write_jsonl(rows, jsonl)
        if args.skip_expand:
            return 0
    load_and_expand(jsonl)
    stats = bq_query(f"""
SELECT 'serving_titles' k, COUNT(*) n FROM `{SERVING}.job_title_translations`
UNION ALL
SELECT 'serving_jobs', COUNT(*) FROM `{SERVING}.job_offer_translations`
UNION ALL
SELECT 'harvest_jobs', COUNT(*) FROM `{HARVEST}.job_offer_translations`
UNION ALL
SELECT locale, COUNT(*) FROM `{SERVING}.job_title_translations` GROUP BY locale
""")
    print(stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
