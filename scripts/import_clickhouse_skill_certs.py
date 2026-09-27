#!/usr/bin/env python3
"""Import graphai.jobs_skill_certs from ClickHouse into BigQuery skill_certs_imported.

Non-blocking: writes seed JSON if ClickHouse SSL fails.
"""
from __future__ import annotations

import base64
import json
import os
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from google.cloud import bigquery

PROJECT = os.environ.get("BQ_PROJECT", "poetic-sentinel-402405")
DATASET = os.environ.get("BQ_DATASET", "apply_jobs_jobs2_prod")
SEED = Path(__file__).resolve().parents[1] / "data" / "skill-courses.seed.json"


def load_env():
    env_path = Path.home() / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(errors="replace").splitlines():
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def fetch_clickhouse():
    host = os.environ.get("CLICKHOUSE_HOST", "b23f71a4si.europe-west2.gcp.clickhouse.cloud")
    port = os.environ.get("CLICKHOUSE_PORT", "8443")
    user = os.environ.get("CLICKHOUSE_SQL_USER", "default")
    password = (
        os.environ.get("CLICKHOUSE_DEFAULT_PASSWORD")
        or os.environ.get("CLICKHOUSE_PASSWORD")
        or os.environ.get("CLICKHOUSE_SECRET")
        or ""
    )
    q = """
    SELECT skill_id, skill_name, level, provider, name, uri, source_url
    FROM graphai.jobs_skill_certs FINAL
    LIMIT 5000
    FORMAT JSON
    """
    url = f"https://{host}:{port}/?database=default"
    req = urllib.request.Request(
        url,
        data=q.encode(),
        method="POST",
        headers={"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()},
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=40, context=ctx) as resp:
        payload = json.loads(resp.read().decode())
    return payload.get("data") or []


def main() -> int:
    load_env()
    rows = []
    try:
        rows = fetch_clickhouse()
        print("clickhouse rows", len(rows))
    except Exception as e:
        print("clickhouse failed", e)
        if SEED.exists():
            rows = json.loads(SEED.read_text())
            print("seed rows", len(rows))
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for r in rows:
        uri = r.get("uri") or r.get("url") or ""
        name = r.get("name") or r.get("title") or ""
        if not uri or not name:
            continue
        out.append(
            {
                "skill_id": str(r.get("skill_id") or "")[:80],
                "skill_name": str(r.get("skill_name") or "")[:120],
                "level": "advanced" if "advanc" in str(r.get("level") or "").lower() else "beginner",
                "provider": str(r.get("provider") or "Google Skills")[:80],
                "name": name[:240],
                "uri": uri[:500],
                "source_url": str(r.get("source_url") or "")[:500],
                "imported_at": now,
            }
        )
    if not out:
        print("nothing to import")
        return 0
    client = bigquery.Client(project=PROJECT, location="EU")
    table = f"{PROJECT}.{DATASET}.skill_certs_imported"
    errors = client.insert_rows_json(table, out)
    print("inserted", len(out), "errors", errors)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
