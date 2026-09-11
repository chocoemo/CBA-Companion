# CBA Companion — Phase 1

Foundation for the Championship Baseball Association companion app: database
schema, StatsPlus API integration layer, one working end-to-end tab (**Big
Board**), and a free 4x/day auto-sync schedule.

This is a real deployable project (Next.js + Postgres via Prisma), not a
single-file artifact — it needs your S+ token to run server-side, which
can't live in a browser-only tool. Everything below is set up to run
entirely on free tiers, no domain purchase needed.

## Quick glossary (since this is your first time doing this)

- **Repo (repository):** a project's folder, tracked by Git, hosted on
  GitHub. Think of it as "the folder Vercel and GitHub Actions both read
  from."
- **Env var (environment variable):** a named secret/setting (like your API
  token or database address) that lives outside the code, in Vercel's
  dashboard, so it's never committed to GitHub for anyone to see.
- **Deploy:** Vercel takes the code from your GitHub repo and turns it into
  a live website at `your-project-name.vercel.app`.
- **Cron / scheduled job:** a task that runs automatically on a timer
  without you clicking anything.

## What's in Phase 1

- **`prisma/schema.prisma`** — full data model: teams, players, dated rating
  snapshots (scout AND OSA, so history/graduations are trackable), contracts,
  picks with ownership, trades/trade-assets (groundwork for pick-lineage and
  trade-return tracing later), GM stints/tendency profiles, the
  self-adjusting pick value curve, tooltip and filter-preset tables.
- **`lib/statsplus.ts`** — client for the S+ API: rate-limit aware, handles
  the API's "200 OK but it's actually a plain-text error" quirk, and the
  `/ratings` async request→poll flow.
- **Sync routes** (`app/api/sync/...`):
  - `POST /api/sync/seed` — one-time setup (Calgary's theme, the initial pick
    value curve). Safe to call more than once.
  - `POST /api/sync/teams`, `POST /api/sync/players` — pull and upsert.
  - `POST /api/sync/ratings/start?source=scout|osa` + `POST
    /api/sync/ratings/poll` — the two-step async ratings flow.
  - `POST /api/sync/run-all` — does teams + players + kicks off both
    ratings dumps in one call; this is what the automated schedule calls.
  - All sync routes require a header `x-sync-secret: <your SYNC_SECRET>` —
    see setup below.
- **Big Board** (`app/big-board`) — sortable table, click a player for the
  full card (overall/potential, tool grades, scout-vs-OSA toggle, scout is
  ALWAYS the default view).
- **`.github/workflows/sync.yml`** — a free GitHub Actions schedule that
  calls `run-all` and then polls both ratings dumps, 4x/day (~12am / 8am /
  2pm / 8pm Eastern). This exists because Vercel's free tier only allows
  cron jobs to run once a day — GitHub Actions has no such limit.
- **`.github/workflows/draft-watch.yml`** — a manually-triggered workflow
  for draft day. `/draftpool` and `/draftv2` have no documented rate limit
  (unlike `/ratings`), so this polls every ~60 seconds instead of waiting
  for the 4x/day schedule — you click "Run workflow" the moment the draft
  actually starts, since there's no way to detect that automatically.
- **`POST /api/sync/draft`** — pulls the remaining draft pool and picks made
  so far, matching picks to `Pick`/`DraftResult` rows (creating them on the
  fly if they don't exist yet) and computing overall pick number from
  round + pick-in-round for a 30-team single combined draft.
- Calgary's color theme wired into CSS variables as the default.

## Rules encoded from the Constitution so far

- 6-year max contract, extension eligibility gated at 3+ years ML service,
  one extension only
- Universal DH
- 3 major-league tiers (Premier/Silver/Bronze) mapped from `/lgdata`, minors
  as Reserves / Dev-A / Dev-B / Youth Academy
- Your house rule: pre-arb (<6 yrs service) defaults to $500K minimum unless
  extended

## Step-by-step: getting this live, for free, with no prior Git experience

### 1. Install GitHub Desktop (no command line needed)

Download from **desktop.github.com**, install it, sign in with a free
GitHub account (or create one at github.com first).

### 2. Turn this folder into a GitHub repo

1. Unzip the project I gave you somewhere on your computer.
2. Open GitHub Desktop → **File → Add Local Repository** → point it at the
   unzipped `cba-companion` folder.
3. It'll say "this isn't a repository yet" — click **create a repository**
   here.
4. Click **Publish repository** (top bar). **Uncheck "Keep this code
   private"** — a public repo gets you unlimited free GitHub Actions
   minutes, and there's nothing secret in the code itself (your token and
   passwords live in Vercel/GitHub secrets, never in the code).

That's it — no typed Git commands required for this whole step.

### 3. Get a free Postgres database

You have two easy options:

- **Vercel Postgres** (via Neon): once your Vercel project exists (next
  step), go to its **Storage** tab → **Create Database** → follow the
  Postgres option. Vercel automatically wires the connection into your
  project's env vars.
- Or sign up separately at **neon.tech** (free tier) and copy the connection
  string it gives you.

Either way, you end up with one long `DATABASE_URL` value — treat it like a
password.

### 4. Import into Vercel

1. On vercel.com: **Add New → Project** → choose the `cba-companion` repo
   you just published. It auto-detects Next.js.
2. Before deploying, add your environment variables (**Settings →
   Environment Variables**, or the "Environment Variables" section on the
   import screen):
   - `DATABASE_URL` — from step 3 (skip if you used Vercel's own Postgres —
     it fills this in for you automatically).
   - `STATSPLUS_TOKEN` — from statsplus.net/cba/ → your account →
     Preferences page. **Expires every 90 days** — the app will surface S+'s
     own "token expired" message when it happens, so you'll know to swap it
     here.
   - `STATSPLUS_LGURL` — `cba`
   - `SYNC_SECRET` — make up any random password-like string (a password
     generator site works fine). Write it down; you'll need it again in
     step 6.
3. Click **Deploy**.

The build step automatically runs `prisma db push`, which creates all the
database tables for you — no local commands needed.

### 5. Run the one-time seed and first sync

Once deployed, you'll have a URL like `https://cba-companion-xyz.vercel.app`.
From your phone or computer's browser, you can't easily send a `POST`
request — use a free tool like **hoppscotch.io** (no account needed) or the
Postman app:

1. `POST https://<your-app>.vercel.app/api/sync/seed`
   Header: `x-sync-secret: <the SYNC_SECRET you made up>`
2. `POST https://<your-app>.vercel.app/api/sync/teams` (same header)
3. `POST https://<your-app>.vercel.app/api/sync/players` (same header)
4. Reload the site — Big Board should show players (without ratings yet).

Ratings take longer (the async dance), which is exactly what the scheduled
job in step 6 automates going forward — but you can test it manually too:

5. `POST /api/sync/ratings/start?source=scout` → note the `logId` it
   returns.
6. Wait ~60 seconds, then `POST /api/sync/ratings/poll` with body
   `{"logId": <that id>}` — repeat every 30s until it says `"status":
   "ready"`.

### 6. Turn on the automatic 4x/day sync

1. In your GitHub repo (on github.com, not Desktop): **Settings → Secrets
   and variables → Actions → New repository secret**. Add two:
   - `APP_URL` — your Vercel URL, no trailing slash (e.g.
     `https://cba-companion-xyz.vercel.app`)
   - `SYNC_SECRET` — the same value you set in Vercel.
2. That's it — `.github/workflows/sync.yml` is already in the repo and will
   start running on its schedule automatically. You can also trigger it by
   hand any time: repo → **Actions** tab → **Sync CBA data** → **Run
   workflow**.

### 7. Draft day: a faster, manually-started check

`/draftpool` and `/draftv2` (remaining pool, picks made) have **no
documented rate limit**, unlike everything else in this app — so instead of
waiting for the 4x/day schedule, there's a second workflow just for draft
day that polls every 60 seconds (configurable) while it's running:

1. The moment the draft actually starts (you'll know from Discord/S+), go to
   your repo's **Actions** tab → **Draft watch (manual)** → **Run
   workflow**.
2. Leave the defaults (60-second interval, ~5h50m duration) or adjust them
   in the two boxes that appear — shorter interval = fresher data, longer
   duration = fewer times you have to re-click it.
3. If the draft is still going when that run times out (GitHub caps a
   single job at 6 hours), just click **Run workflow** again — nothing is
   lost in the gap, it just resumes checking.
4. When the draft wraps up, you don't need to do anything — it stops on its
   own at the end of its duration window, or you can cancel it early from
   the Actions tab.

This uses the same `APP_URL` and `SYNC_SECRET` repo secrets from step 6, so
there's nothing extra to configure the first time you use it.

I'll walk through any of this live with you if a step doesn't behave the way
this doc describes — screenshots/error messages help a lot if something
goes sideways.

## What's deliberately NOT in Phase 1

- Team switcher (Calgary is hardcoded as controlling team for now)
- Draft Log, Org Depth, Trade Calc, Pick Value Chart UI, GM Tendencies —
  schema and API layer are ready; Phase 2/3 build the tabs
- Contract and draft-pool sync routes
- Custom filter builder (at-least/at-most/is/is-not)
- Editable tooltips for imported columns
- CSV drag-and-drop import (your scouting CSVs, OSA dumps, draft class dumps)

## A known gap to flag now

The `/ratings` API's column names/order aren't guaranteed stable, and I
don't have a sample dump from your league yet. `ratings/poll` stores every
column verbatim and guesses at overall/potential. Once you run a real sync
(or send a sample CSV), I'll hard-map every tool grade explicitly.

Same story for `/draftv2`: its published docs don't spell out the exact
JSON field names for round/pick/team/player, so `/api/sync/draft` tries
several plausible key names and stores the full raw response every time.
Once you run a real draft (or send a sample response), I'll hard-map it
precisely instead of guessing.
