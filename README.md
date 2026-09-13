# love-sports-ticker — Bench Warmers newsroom automation

Automation pipeline for a 24/7 sports YouTube channel: detects breaking news, writes
anchor scripts, renders them as HeyGen avatar videos, and gates every render behind a
human approval step. Designed to run unattended for weeks via scheduled GitHub Actions.
Your existing scrolling ticker is a separate on-screen element — this pipeline produces
the talking-head video *segments* that sit alongside it; see "Where this fits" below.

## Pipeline

```
fetch feeds  →  classify (breaking/notable/skip)  →  write script  →  content/drafts/
                                                                             │
                                                          npm run review   (human)
                                                                             │
                                                     content/approved/  or  content/rejected/
                                                                             │
                                                              npm run render  (HeyGen)
                                                                             │
                                             content/rendered/*.json + *.mp4, content/outbox/manifest.json
```

Every stage is a plain file under `content/`, so the entire approval history is a git log —
you can see exactly what was drafted, who approved it, when, and why.

### Stage 1 — Draft (`npm run draft`)

Fetches ESPN's public scoreboard + news endpoints for the leagues in `SPORTS_LEAGUES`
(`src/feeds/espn.ts`), runs each item through the editorial heuristics in
`src/newsroom/breakingNews.ts` (keyword + score-margin rules — tune the keyword lists
there as your channel's voice evolves), and for anything not skipped, generates a
script via the matching anchor character (`src/newsroom/characters.ts` +
`src/newsroom/templates.ts`) and writes it to `content/drafts/<id>.json`.

Scripts are template-based, not LLM-generated: deterministic, free to run, and every
draft is fully reviewable before it costs a HeyGen credit.

Set `USE_SAMPLE_FEED=1` to run against local fixtures (`src/feeds/sampleFixtures.ts`)
instead of hitting ESPN — useful for dev/demo without network.

### Stage 2 — Review (`npm run review`)

Interactive CLI: shows each pending draft's script, source link, and the reasons it was
flagged, then lets you approve, reject, or skip it. Approving moves the file to
`content/approved/`; rejecting moves it to `content/rejected/` with your note attached.
Nothing reaches HeyGen without this step.

### Stage 3 — Render (`npm run render`)

For every file in `content/approved/`, calls the HeyGen Video Generation API
(`src/heygen/client.ts`) with that character's avatar/voice ID, polls until the render
completes, downloads the MP4 into `content/rendered/<id>.mp4`, and appends an entry to
`content/outbox/manifest.json` — the ordered list your playout tooling reads from.

## Setup

```bash
npm install
cp .env.example .env   # fill in HEYGEN_API_KEY
```

Then, in `src/newsroom/characters.ts`, replace the `REPLACE_WITH_HEYGEN_AVATAR_ID_*` and
`REPLACE_WITH_HEYGEN_VOICE_ID_*` placeholders with real avatar/voice IDs from your HeyGen
account (Avatars / Voices library). `npm run render` refuses to call HeyGen for any
character still carrying a placeholder, so there's no risk of accidentally burning
credits on an unconfigured persona.

## Anchor characters

Three personas ship as a starting point (`src/newsroom/characters.ts`):

| Character | Handles | Tone |
|---|---|---|
| Coach Ray | injuries, transactions | gruff veteran analyst |
| Jules Fastbreak | close/upset final scores | high-energy hype reporter |
| Digest Dana | everything else (routine finals, general headlines) | calm roundup anchor |

Add more by pushing onto the `characters` array; the first character whose `handles()`
predicate matches a given news item wins, so order encodes priority.

## Running it for weeks: scheduling

Two workflows in `.github/workflows/` keep this running without a server:

- **`draft-schedule.yml`** — runs `npm run draft` every 20 minutes and commits any new
  files under `content/drafts/` straight to the branch. Costs nothing but a couple of
  ESPN requests per run.
- **`render-on-approval.yml`** — triggers when a push touches `content/approved/**`
  (i.e. right after you run `npm run review` and push), calls HeyGen, commits the
  rendered metadata + manifest, and uploads the `.mp4` files as a build artifact.

Your review loop in practice: `git pull`, `npm run review`, `git push`. The render
workflow picks it up automatically. Add `HEYGEN_API_KEY` as a repo secret
(Settings → Secrets and variables → Actions) before the render workflow can do anything.

Rendered video files are gitignored (`content/rendered/*.mp4`) since they're large
binaries — the workflow currently surfaces them as a downloadable Actions artifact.
**Wire the "Upload rendered video files" step in `render-on-approval.yml` to whatever
actually feeds your 24/7 encoder** (an OBS watch-folder synced via rclone/S3, a direct
upload to your streaming box, etc.) — that integration point depends on how your stream
is run and isn't something this repo can guess.

## Where this fits with your existing ticker

This repo assumes your scrolling sports ticker already exists as a separate on-screen
element (e.g. an OBS browser source). This pipeline is only responsible for the
talking-head avatar segments — `content/outbox/manifest.json` is the hand-off point:
each entry has a `videoPath`, `headline`, `character`, `estimatedSeconds`, and
`sourceUrl`, which is enough for a scene-switcher script to sequence segments and for
your ticker to optionally echo the same headline text if you want them in sync.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest — breaking-news classifier, script writer, HeyGen client (mocked)
```

## Directory guide

```
src/feeds/         ESPN fetchers + normalized NewsItem type + offline fixtures
src/newsroom/      breaking-news heuristics, characters, script templates
src/approval/      file-based draft store + interactive review CLI
src/heygen/        HeyGen API client (generate, poll, types)
src/pipeline/      the three stage entrypoints (draft.ts, render.ts) + outbox manifest
content/           the actual queue: drafts/ approved/ rejected/ rendered/ outbox/
.github/workflows/ scheduled draft + on-approval render automation
```
