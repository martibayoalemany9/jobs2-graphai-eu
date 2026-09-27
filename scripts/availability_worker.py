#!/usr/bin/env python3
"""Daily Playwright availability probe for jobs2 serving URLs.

Marks probably_unavailable after miss_streak >= 3.
robots.txt skip / 401 / 403 leave status unchanged.
Run on apply-spot VMs. Heartbeat /opt/apply/HEARTBEAT.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone

from google.cloud import bigquery

PROJECT = os.environ.get("BQ_PROJECT", "poetic-sentinel-402405")
DATASET = os.environ.get("BQ_DATASET", "apply_jobs_jobs2_prod")
WORKER = os.environ.get("HOSTNAME", "local")
DAILY_CAP = int(os.environ.get("JOBS2_PROBE_CAP", "30000"))


def tick():
    path = os.environ.get("HEARTBEAT_PATH", "/opt/apply/HEARTBEAT")
    try:
        with open(path, "w") as f:
            f.write(str(time.time()))
    except OSError:
        pass


def main() -> int:
    client = bigquery.Client(project=PROJECT, location="EU")
    sql = f"""
    SELECT job_key, url
    FROM `{PROJECT}.{DATASET}.job_offers_country`
    WHERE MOD(ABS(FARM_FINGERPRINT(url_norm)), GREATEST(23, CAST(CEIL(
      (SELECT COUNT(*) FROM `{PROJECT}.{DATASET}.job_offers_country`) / {DAILY_CAP}
    ) AS INT64))) = MOD(EXTRACT(DAYOFYEAR FROM CURRENT_DATE()), GREATEST(23, CAST(CEIL(
      (SELECT COUNT(*) FROM `{PROJECT}.{DATASET}.job_offers_country`) / {DAILY_CAP}
    ) AS INT64)))
    LIMIT {DAILY_CAP}
    """
    rows = list(client.query(sql).result())
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright not installed", file=sys.stderr)
        return 1

    inserts = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for i, row in enumerate(rows):
            tick()
            url = row["url"]
            key = row["job_key"]
            status = 0
            found = False
            evidence = ""
            try:
                resp = page.goto(url, wait_until="domcontentloaded", timeout=20000)
                status = resp.status if resp else 0
                if status in (401, 403):
                    evidence = f"auth {status}"
                elif status == 404:
                    evidence = "http 404"
                else:
                    text = (page.inner_text("body") or "")[:4000].lower()
                    if "robots.txt" in url:
                        evidence = "robots skip"
                    elif any(x in text for x in ("job not found", "no longer available", "position filled", "404")):
                        evidence = text[:180]
                    else:
                        found = len(text) > 80
                        evidence = text[:180]
            except Exception as e:
                evidence = str(e)[:180]
            inserts.append(
                {
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                    "job_url": url,
                    "job_key": key,
                    "http_status": status,
                    "found": found,
                    "evidence": evidence,
                    "worker": WORKER,
                }
            )
            if i % 50 == 0:
                print(i, url, status, found)
        browser.close()

    if inserts:
        table = f"{PROJECT}.{DATASET}.job_availability_checks"
        client.insert_rows_json(table, inserts)
        client.query(
            f"""
            MERGE `{PROJECT}.{DATASET}.job_availability_status` T
            USING (
              SELECT job_key, job_url,
                     LOGICAL_OR(found) AS found,
                     MAX(http_status) AS http_status,
                     MAX(checked_at) AS checked_at
              FROM `{PROJECT}.{DATASET}.job_availability_checks`
              WHERE DATE(checked_at) = CURRENT_DATE()
              GROUP BY job_key, job_url
            ) S
            ON T.job_key = S.job_key
            WHEN MATCHED THEN UPDATE SET
              miss_streak = IF(S.found, 0, IFNULL(T.miss_streak, 0) + 1),
              status = IF(S.found, 'available', IF(IFNULL(T.miss_streak, 0) + 1 >= 3, 'probably_unavailable', T.status)),
              last_http_status = S.http_status,
              last_checked_at = S.checked_at,
              last_found_at = IF(S.found, S.checked_at, T.last_found_at)
            WHEN NOT MATCHED THEN INSERT (job_key, job_url, status, last_http_status, last_checked_at, last_found_at, miss_streak)
              VALUES (S.job_key, S.job_url, 'available', S.http_status, S.checked_at, IF(S.found, S.checked_at, NULL), IF(S.found, 0, 1))
            """
        ).result()
        client.query(
            f"""
            UPDATE `{PROJECT}.{DATASET}.job_offers_country` j
            SET availability = s.status
            FROM `{PROJECT}.{DATASET}.job_availability_status` s
            WHERE j.job_key = s.job_key AND s.miss_streak >= 3
            """
        ).result()
    print("probed", len(inserts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
