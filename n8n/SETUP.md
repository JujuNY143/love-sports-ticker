# Bench Warmers — n8n setup (no coding required)

This turns a Google Sheet into a 24/7 pipeline: you type a title + story idea in a
spreadsheet row, HeyGen renders it as an avatar video, you watch it and approve or
reject it, and approved ones get uploaded to YouTube automatically (as **unlisted**,
so nothing goes public without you separately flipping it to public in YouTube Studio).

You will do some clicking (signing into your own accounts, pasting your HeyGen key).
You will not write or edit any code. Every step below tells you exactly what to click.

Do these in order. Don't skip ahead — later steps need IDs/keys from earlier ones.

---

## 1. Create your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet.
   Name it **Bench Warmers Control Sheet**.
2. Rename the first tab (bottom-left, currently "Sheet1") to exactly `Sheet1` — it
   already is by default, so you can skip this if you haven't renamed it.
3. Click into cell A1, then go to **File → Import → Upload**, and upload
   `n8n/sheet1-control-template.csv` from this repo. When it asks how to import,
   choose **"Replace current sheet"**. This gives you the right column headers plus
   3 example rows to start with.
4. Add a second tab: click the **+** at the bottom-left, rename the new tab to exactly
   `Characters`. Repeat the import (File → Import → Upload →
   `n8n/sheet2-characters-template.csv`, replace current sheet) on this tab.
5. Look at your browser's address bar. The URL looks like:
   `https://docs.google.com/spreadsheets/d/`**`1AbC-longRandomId_hereXYZ`**`/edit`
   Copy that long ID in the middle — you'll paste it into n8n in step 5. Keep this
   tab open.

**Columns in `Sheet1`** (one row = one video idea):
- `id` — any unique number, you assign it
- `title` — the YouTube video title
- `story_idea` — what happens in the segment (this becomes the script unless you fill in `script_override`)
- `character` — must exactly match a row in the `Characters` tab (`coach-ray`, `jules-fastbreak`, or `digest-dana`)
- `script_override` — optional: write the exact words yourself instead of using `story_idea`
- `production_status` — the control switch (see below)
- `video_url`, `heygen_video_id`, `notes` — filled in automatically, leave blank

**`production_status` values you control:**
| Value you type | What it means |
|---|---|
| `create` | "Please generate this one." Set this when you add a new row. |
| `approved` | "I watched it, publish it to YouTube." You set this after reviewing. |
| *(anything else, or blank)* | Ignored — nothing happens to this row. |

**Values the automation sets for you (don't type these yourself):**
`generating` → `pending approval` → `published`, or `generation_failed` if HeyGen
took too long (reset it to `create` to retry).

---

## 2. Sign up for n8n (where the automation actually runs)

1. Go to [n8n.io](https://n8n.io) and sign up for **n8n Cloud** (there's a free trial;
   after that their Starter plan is enough for this). Cloud means you don't manage a
   server — this matters because the workflow needs to keep running 24/7.
2. Once you're in, you'll land on the n8n dashboard. Leave this tab open too.

---

## 3. Get your HeyGen API key

1. Log into [app.heygen.com](https://app.heygen.com), go to your account/settings,
   and find **API Key** (usually under a "Settings" or "API" section). Copy it.
2. In n8n, go to **Credentials** (left sidebar) → **Add Credential** → search for
   **"Header Auth"** → select it.
3. Set:
   - **Name**: `HeyGen API Key`
   - **Name** (header field): `X-Api-Key`
   - **Value**: paste your HeyGen key
4. Save.

---

## 4. Find your HeyGen avatar and voice IDs

Each of the 3 Bench Warmers characters needs a HeyGen avatar + voice:

1. In HeyGen, go to **Avatars**, pick (or create) 3 avatars you want to use.
2. Click each avatar and copy its **Avatar ID** (usually visible in the avatar's
   details panel or URL).
3. Go to **Voices**, pick a voice for each character, copy each **Voice ID**.
4. Go back to your Google Sheet's `Characters` tab and paste the real IDs into the
   `heygen_avatar_id` / `heygen_voice_id` columns, replacing the
   `PUT_HEYGEN_AVATAR_ID_HERE` placeholders — one row per character.

---

## 5. Connect Google Sheets in n8n

1. In n8n, **Credentials → Add Credential → Google Sheets Account**.
2. Click **Sign in with Google**, log in with the Google account that owns your
   sheet, and approve the permissions n8n asks for. Save.

(This is a real login screen, not code — same as signing into any app with Google.)

---

## 6. Set up YouTube upload access

This part has more steps because Google requires every app to register its own
project before it can upload videos to YouTube — there's no way around this, it's
a Google policy, not an n8n limitation. Still no coding, just console clicking:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a
   new project (top-left project dropdown → **New Project**). Name it anything,
   e.g. "Bench Warmers Uploader."
2. In the search bar at the top, search **"YouTube Data API v3"** and click
   **Enable** on it.
3. Search **"OAuth consent screen"** in the same search bar, open it:
   - User type: **External**
   - Fill in an app name (e.g. "Bench Warmers"), your email for support/contact.
   - Under **Scopes**, you don't need to add any manually right now.
   - Under **Test users**, add your own YouTube channel's Google account email.
   - Save through the remaining steps (defaults are fine).
4. Search **"Credentials"**, click **Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Under **Authorized redirect URIs**, add:
     `https://<your-n8n-cloud-subdomain>.app.n8n.cloud/rest/oauth2-credential/callback`
     (n8n shows you this exact URL in the next step — copy it from there if unsure.)
   - Click **Create**. Copy the **Client ID** and **Client Secret** shown.
5. Back in n8n: **Credentials → Add Credential → YouTube OAuth2 API**.
   - Paste the Client ID and Client Secret from step 4.
   - Click **Sign in with Google**, log in with your YouTube channel's account,
     and approve.
6. Save.

If Google shows a warning that the app is "unverified," that's expected for a
personal project — click **Advanced → Go to [app name] (unsafe)** to proceed. It's
only unverified because you haven't submitted it for Google's public-app review,
which isn't necessary for uploading to your own channel.

---

## 7. Import the two workflows

1. In n8n, click **Add workflow → Import from File**, and import
   `n8n/bench-warmers-generate.json` from this repo.
2. Repeat for `n8n/bench-warmers-publish.json`.
3. **In both workflows**, click on every **Google Sheets** node (there are several)
   and, in the spreadsheet/sheet-tab fields, paste in the Google Sheet ID you copied
   in step 1 (or pick it from the dropdown that appears once you're signed in) and
   pick the right tab (`Sheet1` or `Characters`). Every Google Sheets node currently
   says `PUT_YOUR_GOOGLE_SHEET_ID_HERE` — that's a placeholder, not a real ID.
4. Click each node that has a small red/orange warning badge and attach the matching
   credential from the dropdown:
   - The two **"Ask HeyGen..."** / **"Check..."** HTTP Request nodes → `HeyGen API Key`
   - Every **Google Sheets** node → your Google Sheets credential
   - **"Upload To YouTube"** → your YouTube OAuth2 credential
   This is completely normal — credentials never travel inside a shared workflow
   file for security, so every imported workflow needs this one-time step.
5. Click **Save** on both workflows, then toggle **Active** (top-right) to on for both.

---

## 8. Your day-to-day routine

1. **Add ideas**: in `Sheet1`, add a new row any time — `title`, `story_idea`,
   `character`, and set `production_status` to `create`.
2. **Wait**: within the hour, the Generate workflow picks it up. After roughly
   3–5 minutes, `production_status` becomes `pending approval` and `video_url` fills
   in with a link.
3. **Review**: click the `video_url` link, watch it.
   - Good? Change `production_status` to `approved`.
   - Not good? Leave it, delete the row, or write yourself a note in `notes`.
4. **Publish**: within 30 minutes, the Publish workflow uploads it to YouTube as
   **unlisted** and sets `production_status` to `published`, with the YouTube link
   in `notes`. Open YouTube Studio and flip it to **Public** whenever you're ready —
   that final "make it public" click is intentionally left to you.

That's it — no code, ever, after this one-time setup.

---

## Troubleshooting

- **A node shows a red exclamation mark.** Click it — it's almost always "pick a
  credential" or "pick a spreadsheet/sheet from the dropdown," both one click.
- **`production_status` stuck on `generating` for a long time.** Open n8n's
  **Executions** tab on the Generate workflow to see what happened; check HeyGen's
  own dashboard to see if the video actually finished. Reset the row to `create`
  to retry.
- **YouTube upload fails with a permissions error.** Re-open the YouTube OAuth2
  credential in n8n and click Sign in with Google again — Google sometimes expires
  the connection after a few days until the app is fully verified.
- **Costs**: HeyGen bills per rendered minute of avatar video (check your HeyGen
  plan/dashboard for the rate) — that's the only per-video cost in this pipeline.
  n8n Cloud is a flat monthly subscription regardless of how many videos you run.
