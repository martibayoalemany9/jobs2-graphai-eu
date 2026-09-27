#!/usr/bin/env python3
"""Eurostat une_rt_m unemployment + World Bank SL.UEM.TOTL.ZS fallback into kpi_country_monthly."""
from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timezone

from google.cloud import bigquery

PROJECT = os.environ.get("BQ_PROJECT", "poetic-sentinel-402405")
DATASET = os.environ.get("BQ_DATASET", "apply_jobs_jobs2_prod")
ISO = ["DE", "NL", "CZ", "GB", "US", "FR", "ES", "IT", "PL", "SE", "AT", "CH", "BE", "IE", "DK"]


def eurostat():
    url = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m?format=JSON&geo=DE&geo=NL&geo=CZ&geo=UK&geo=FR&geo=ES&geo=IT&geo=PL&s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT"
    with urllib.request.urlopen(url, timeout=40) as r:
        return json.loads(r.read().decode())


def worldbank(iso2: str):
    url = f"https://api.worldbank.org/v2/country/{iso2.lower()}/indicator/SL.UEM.TOTL.ZS?format=json&per_page=20"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode())


def main() -> int:
    client = bigquery.Client(project=PROJECT, location="EU")
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    try:
        data = eurostat()
        # Keep a few latest values if the JSON shape is the statistics API.
        print("eurostat keys", list(data)[:8])
    except Exception as e:
        print("eurostat failed", e)
    for iso in ISO:
        try:
            payload = worldbank("GB" if iso == "UK" else iso)
            series = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
            for item in series[:12]:
                if item.get("value") is None:
                    continue
                year = int(item.get("date") or 0)
                rows.append(
                    {
                        "year_month": f"{year}-01-01",
                        "country_iso2": iso,
                        "unemployment_rate": float(item["value"]),
                        "source": "worldbank",
                        "fetched_at": now,
                    }
                )
                break
        except Exception as e:
            print("wb fail", iso, e)
    if not rows:
        print("no kpi rows")
        return 0
    table = f"{PROJECT}.{DATASET}.kpi_country_monthly"
    errors = client.insert_rows_json(table, rows)
    print("kpi rows", len(rows), "errors", errors)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
