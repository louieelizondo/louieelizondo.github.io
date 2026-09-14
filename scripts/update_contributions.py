#!/usr/bin/env python3
"""Refresh assets/data/contributions.json from GitHub + this repo's git log.

GitHub's public contribution graph only counts commits that land on a default
branch with an author email verified on the account. This kitchen's recent
work often fails that test (feature branches, bot emails), so the site also
paints every commit in this repository. The calendar is the max of both
sources per day.
"""

from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "contributions.json"
USER = "louieelizondo"

LEVEL = {
    "NONE": 0,
    "FIRST_QUARTILE": 1,
    "SECOND_QUARTILE": 2,
    "THIRD_QUARTILE": 3,
    "FOURTH_QUARTILE": 4,
}


def level_from_count(n: int) -> int:
    if n <= 0:
        return 0
    if n <= 2:
        return 1
    if n <= 5:
        return 2
    if n <= 8:
        return 3
    return 4


def github_calendar() -> list[dict]:
    query = """
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
    """
    try:
        raw = subprocess.check_output(
            [
                "gh",
                "api",
                "graphql",
                "-f",
                f"query={query}",
                "-F",
                f"login={USER}",
            ],
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"GitHub GraphQL skipped: {exc}", file=sys.stderr)
        return []

    data = json.loads(raw)
    weeks = (
        data.get("data", {})
        .get("user", {})
        .get("contributionsCollection", {})
        .get("contributionCalendar", {})
        .get("weeks", [])
    )
    days = []
    for week in weeks:
        for day in week.get("contributionDays", []):
            days.append(
                {
                    "date": day["date"],
                    "github": int(day.get("contributionCount") or 0),
                    "ghLevel": LEVEL.get(day.get("contributionLevel") or "NONE", 0),
                }
            )
    return days


def site_commits() -> Counter:
    try:
        raw = subprocess.check_output(
            ["git", "-C", str(ROOT), "log", "--all", "--pretty=format:%ad", "--date=short"],
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        print(f"git log failed: {exc}", file=sys.stderr)
        return Counter()
    return Counter(line.strip() for line in raw.splitlines() if line.strip())


def last_year_dates() -> list[str]:
    today = date.today()
    # GitHub calendars start on Sunday of the week that contains (today - 365).
    start = today - timedelta(days=365)
    start -= timedelta(days=(start.weekday() + 1) % 7)
    days = []
    cursor = start
    while cursor <= today:
        days.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return days


def main() -> int:
    gh_days = {d["date"]: d for d in github_calendar()}
    site = site_commits()
    if gh_days:
        start = date.fromisoformat(min(gh_days))
        end = max(date.today(), date.fromisoformat(max(gh_days)))
        dates = []
        cursor = start
        while cursor <= end:
            dates.append(cursor.isoformat())
            cursor += timedelta(days=1)
    else:
        dates = last_year_dates()

    days = []
    for iso in dates:
        gh = gh_days.get(iso, {})
        github = int(gh.get("github") or 0)
        kitchen = int(site.get(iso) or 0)
        count = max(github, kitchen)
        days.append(
            {
                "date": iso,
                "github": github,
                "site": kitchen,
                "count": count,
                "level": level_from_count(count),
            }
        )

    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "githubUser": USER,
        "githubTotal": sum(d["github"] for d in days),
        "siteTotal": sum(d["site"] for d in days),
        "combinedTotal": sum(d["count"] for d in days),
        "days": days,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        previous = json.loads(OUT.read_text())
        same = (
            previous.get("days") == days
            and previous.get("githubTotal") == payload["githubTotal"]
            and previous.get("siteTotal") == payload["siteTotal"]
        )
        if same:
            print("Calendar unchanged; leaving generated timestamp alone")
            return 0
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(
        f"Wrote {OUT.relative_to(ROOT)} "
        f"(github={payload['githubTotal']} site={payload['siteTotal']} combined={payload['combinedTotal']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
