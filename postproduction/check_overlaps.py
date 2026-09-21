#!/usr/bin/env python3
"""
Checks nfl-top10-salaries-2026-27.csv for two problems before it's handed to
the HyperFrames build: overlapping start_time/end_time ranges (two player
cards trying to show at once) and missing required fields.

Usage:
    python3 check_overlaps.py
    python3 check_overlaps.py path/to/other.csv
"""
import csv
import sys
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_CSV = HERE / "nfl-top10-salaries-2026-27.csv"

REQUIRED = ["rank", "player_name", "team", "position", "salary_aav", "start_time", "end_time"]


def parse_time(value: str, row_label: str) -> float:
    parts = value.strip().split(":")
    if len(parts) not in (2, 3) or not all(p.isdigit() for p in parts):
        sys.exit(f"Row {row_label}: bad time '{value}' - expected mm:ss or hh:mm:ss")
    parts = [int(p) for p in parts]
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, s = parts
    return h * 3600 + m * 60 + s


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))

    spans = []
    problems = []

    for row in rows:
        label = f"rank {row.get('rank', '?')} ({row.get('player_name') or 'unnamed'})"
        missing = [field for field in REQUIRED if not row.get(field, "").strip()]
        if missing:
            problems.append(f"{label}: missing {', '.join(missing)}")
            continue
        start = parse_time(row["start_time"], label)
        end = parse_time(row["end_time"], label)
        if end <= start:
            problems.append(f"{label}: end_time ({row['end_time']}) is not after start_time ({row['start_time']})")
            continue
        spans.append((start, end, label))

    spans.sort()
    for i in range(1, len(spans)):
        prev_start, prev_end, prev_label = spans[i - 1]
        start, end, label = spans[i]
        if start < prev_end:
            problems.append(f"{label} overlaps {prev_label}: starts at {row_time(start)} before {row_time(prev_end)} ends")

    if problems:
        print(f"Found {len(problems)} problem(s) in {path.name}:\n")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)

    print(f"{path.name}: {len(spans)} complete rows, no overlaps, no missing fields.")


def row_time(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


if __name__ == "__main__":
    main()
