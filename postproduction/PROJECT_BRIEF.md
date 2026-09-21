# Project brief: NFL Top-10 Salaries 2026-27 — card overlay recut

**Scope note (read first):** this brief covers ONE thing only — packaging the
existing NFL salary countdown video with data-callout cards. It has nothing
to do with the rest of this repo (the 24/7 newsroom automation, HeyGen anchor
characters, n8n workflows, the approval-queue pipeline). Don't touch any of
`src/newsroom/`, `src/heygen/`, `src/pipeline/`, or `n8n/` for this task.
This is a standalone video edit.

## What this is

A 15:37 narrated video ("Top 10 highest-paid NFL players, 2026-27 season")
needs each player's stat card — name, team, position, salary, cap hit —
to pop up on screen timed to when the narrator introduces them. The
underlying footage plays unchanged; we're layering designed graphic
overlays on top of it.

In HyperFrames terms, this is the **`/talking-head-recut`** route:
existing talking-head footage + transcript-synced graphic-overlay cards
(data callouts / lower-thirds). Read `.agents/skills/talking-head-recut/`
before building.

## What already exists (don't redo this work)

- **Source footage:** `postproduction/raw/NFL_Highest_Paid-Full.mp4` —
  1920x1080, h264/aac, 937.2s (15:37). Not tracked in git (too large,
  see `.gitignore`) — if it's not on this machine yet, either use your
  own original export, or pull it from
  `https://github.com/JujuNY143/love-sports-ticker/releases/tag/play`
  (sha256 `75cfca793b1daf2d4caaccdc7022bf2e8084c13203e9f262157bfc04df553d9a`).
- **Per-player data, already filled in:** `postproduction/nfl-top10-salaries-2026-27.csv`
  — rank, player_name, team, position, salary_aav, cap_hit_2026,
  cap_hit_2027, photo_filename, start_time, end_time, notes. All 10 rows
  are populated from the video's own transcript (names, teams, AAV figures,
  and estimated on-screen timing windows — see "Open items" below).
- **Validator:** `postproduction/check_overlaps.py` — run it after any CSV
  edit. It fails loudly on overlapping time windows or missing required
  fields. Re-run before building anything.
- **HyperFrames skills:** already installed (`.agents/skills/`,
  `.claude/`, `skills-lock.json`), including `talking-head-recut`,
  `hyperframes-core`, `hyperframes-animation`, `media-use`, etc.
- **Photos folder scaffolded:** `postproduction/photos/` — empty, needs
  the 10 headshots. `photo_filename` in the CSV already names the
  expected file for each player (e.g. `mahomes.jpg`).

## What's still needed from the user

1. **10 player headshots**, dropped into `postproduction/photos/` matching
   the `photo_filename` column. (This was blocked in the prior cloud
   session by network policy — should work fine on this machine.)
   **Licensing caveat:** official team/league photos are usually
   copyrighted. Prefer Wikimedia Commons images with a real CC/public-domain
   tag, licensed stock, or the user's own material — not just
   whatever image search turns up — if this video will be monetized.
2. **A quick scrub-through pass** on the CSV's `start_time`/`end_time`
   values — they're estimated from the transcript's narration timing,
   not yet verified against the actual on-screen graphic timing in the
   footage. Nudge them if they're off.
3. **A decision on the tied $55M group's order** (ranks 7-3: Burrow,
   Love, Lawrence, Allen, Mayfield) — currently ordered by when the
   narration discusses each by name. Fine as-is unless the user wants
   a different order (alphabetical, by team, etc.).

## Step-by-step: what to do in this session

1. Confirm the CSV validates: `python3 postproduction/check_overlaps.py`
2. Get the headshots into `postproduction/photos/` (from the user).
3. Invoke `/hyperframes` (or `/talking-head-recut` directly) and treat
   this brief as the answers to its intake interview:
   - **Route:** `talking-head-recut`
   - **Input clip:** `postproduction/raw/NFL_Highest_Paid-Full.mp4`
   - **Aspect:** 1920x1080 (source is already 16:9 landscape — keep it)
   - **Card content per player:** name, team + position, salary AAV,
     cap hit (2026/2027 — only populated for Mahomes right now)
   - **Card timing:** drive it from `postproduction/nfl-top10-salaries-2026-27.csv`'s
     `start_time`/`end_time` columns, one card per row
   - **Style:** data-callout / lower-third — open to the workflow's
     recommendation once it probes the footage; no strong preference
     locked in yet
   - **Length:** full 15:37, untouched — this is an overlay pass, not a
     re-cut/re-edit of the underlying footage
4. Let HyperFrames' own `hyperframes init` write the real `BRIEF.md` inside
   whatever project folder it scaffolds — don't hand-copy this file into
   that folder (its lifecycle rules expect `init` to see an empty directory).
5. Build, preview, and get user approval before any `--quality delivery`
   render, same as every other HyperFrames project.

## Explicitly out of scope for this task

- Anything about HeyGen avatars, anchor characters, or the newsroom
  automation pipeline in this repo.
- Re-editing/re-cutting the underlying footage itself.
- Anything to do with the broader `love-sports-ticker` product beyond
  this one recut.
