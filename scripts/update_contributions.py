#!/usr/bin/env python3
"""Refresh assets/data/contributions.json from GitHub + this repo's git log.

Counts follow GitHub's contribution calendar merged with every commit in this
repository (max per day). Each day stores total count plus public and private
commit counts only (no commit messages).
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "contributions.json"
USER = "louieelizondo"
SITE_REPO = "louieelizondo/louieelizondo.github.io"

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


def gh_api(path: str, token: str | None = None) -> object:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "louieelizondo-contrib-script",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"https://api.github.com{path}", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def github_token() -> str | None:
    import os

    return os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")


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


def site_public_commit_counts() -> Counter:
    """Public commits from this repository (counts only)."""
    return site_commits()


def verify_repo_public(full: str, cache: dict[str, bool], token: str | None) -> bool:
    if full in cache:
        return cache[full]
    try:
        data = gh_api(f"/repos/{full}", token)
        ok = not bool(data.get("private"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
        print(f"Repo visibility check failed for {full}: {exc}", file=sys.stderr)
        ok = False
    cache[full] = ok
    return ok


def public_repos(token: str | None) -> list[str]:
    repos: list[str] = []
    page = 1
    while page <= 10:
        try:
            if token:
                batch = gh_api(
                    f"/users/{USER}/repos?type=owner&per_page=100&page={page}&sort=pushed",
                    token,
                )
            else:
                batch = gh_api(
                    f"/users/{USER}/repos?type=owner&per_page=100&page={page}&sort=pushed"
                )
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
            print(f"List repos skipped: {exc}", file=sys.stderr)
            break
        if not isinstance(batch, list) or not batch:
            break
        for repo in batch:
            if repo.get("private"):
                continue
            full = repo.get("full_name")
            if full and full != SITE_REPO:
                repos.append(full)
        if len(batch) < 100:
            break
        page += 1
    return repos


def public_repo_commit_counts(since: date, token: str | None) -> Counter:
    """Count commits per day in public repos (excluding this site repo)."""
    since_iso = since.isoformat() + "T00:00:00Z"
    counts: Counter = Counter()
    visibility: dict[str, bool] = {}
    repos = public_repos(token)
    for full in repos:
        if not verify_repo_public(full, visibility, token):
            continue
        page = 1
        while page <= 5:
            path = (
                f"/repos/{full}/commits?author={USER}&since={since_iso}"
                f"&per_page=100&page={page}"
            )
            try:
                commits = gh_api(path, token)
            except (urllib.error.URLError, urllib.error.HTTPError) as exc:
                print(f"Commits for {full} skipped: {exc}", file=sys.stderr)
                break
            if not isinstance(commits, list) or not commits:
                break
            for commit in commits:
                c = commit.get("commit") or {}
                author = c.get("author") or {}
                day = (author.get("date") or "")[:10]
                sha = commit.get("sha") or ""
                if not day or not sha:
                    continue
                counts[day] += 1
            if len(commits) < 100:
                break
            page += 1
    return counts


def merge_public_counts(*counters: Counter) -> Counter:
    merged: Counter = Counter()
    for counter in counters:
        merged.update(counter)
    return merged


def last_year_dates() -> list[str]:
    today = date.today()
    start = today - timedelta(days=365)
    start -= timedelta(days=(start.weekday() + 1) % 7)
    days = []
    cursor = start
    while cursor <= today:
        days.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return days


def main() -> int:
    token = github_token()
    gh_days = {d["date"]: d for d in github_calendar()}
    site = site_commits()
    visibility: dict[str, bool] = {SITE_REPO: True}

    if gh_days:
        start = date.fromisoformat(min(gh_days))
        end = max(date.today(), date.fromisoformat(max(gh_days)))
    else:
        start = date.fromisoformat(last_year_dates()[0])
        end = date.today()

    public_counts = merge_public_counts(site_public_commit_counts(), public_repo_commit_counts(start, token))

    dates = []
    cursor = start
    while cursor <= end:
        dates.append(cursor.isoformat())
        cursor += timedelta(days=1)

    days = []
    for iso in dates:
        gh = gh_days.get(iso, {})
        github = int(gh.get("github") or 0)
        kitchen = int(site.get(iso) or 0)
        count = max(github, kitchen)
        public_n = min(count, int(public_counts.get(iso) or 0))
        private_n = max(0, count - public_n)
        days.append(
            {
                "date": iso,
                "count": count,
                "level": level_from_count(count),
                "public": public_n,
                "private": private_n,
            }
        )

    total = sum(d["count"] for d in days)
    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": total,
        "days": days,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        previous = json.loads(OUT.read_text())
        same = previous.get("days") == days and previous.get("total") == total
        if same:
            print("Calendar unchanged; leaving generated timestamp alone")
            return 0
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {OUT.relative_to(ROOT)} (total={total})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
