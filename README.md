# BMFC Club Hub

Squad app for **Bishop Middleham FC** — fixtures, league table, stats, player profiles, calendar, availability, and admin tools. Invite-only sign-up with login-name sign-in (e.g. **ChrisL**; shown in the app as **Chris L**). Built with React, Vite, Tailwind, and Supabase.

**Audit:** [docs/AUDIT.md](docs/AUDIT.md) v11 — **98 / 100**

## Features

| Area | What’s included |
|------|-----------------|
| **Players** | Dashboard, DDSFL fixtures & table, results, squad stats (incl. accurate GK clean sheets), player profiles, calendar (training, matches, events, fundraisers), availability, PWA “Add to home screen” prompt |
| **Admin / committee** | Squad list, fixtures, live matchday logging, results (optional manual GK for clean sheets), training, events, fundraisers (archive vs delete), **finance** (sponsorships & expenses), lineup builder, availability overview, push notifications |
| **Admin only** | Squad member invites (one-time + reusable team link), passcode resets, name edits, approvals |

Finance entries show **Logged by** (and **Edited by** when changed) for transparency. All writes are RPC-gated on Supabase.

## Quick start (mock mode)

Mock mode is the default. No Supabase project required.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

On the login screen, use **Test** (player) or **Test as admin** to explore the app with DDSFL scrape data and sample squad.

## Live Supabase mode

To connect a real backend:

1. Copy `.env.example` to `.env.local`
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_CLUB_DATA_SOURCE=supabase`  
   Use the **Club Hub** Supabase project (not the World Cup predictor). Keys are under **Settings → API**.
3. Follow **[docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)** to run migrations **001–028** (all applied on production Club Hub), seed admins, and deploy the push function
4. Restart `npm run dev` after changing env vars

New players can join via:

- **One-time invite** — `/invite/:token` (admin creates per player)
- **Team invite link** — `/join/:token` (reusable link from Admin → Squad members)

Both flows: enter first/last name, set a 4-digit passcode, then await admin approval.

### Deploy on Vercel

Add these under **Environment Variables**, then redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLUB_DATA_SOURCE=supabase`
- `VITE_VAPID_PUBLIC_KEY` (optional — required for production push notifications)

See [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md#vercel-bmfcapp).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest (watch) — skip on Windows OneDrive; use CI instead |
| `npm run test:vitest` | Run Vitest once (direct — used in CI container) |
| `npm run test:ci` | Local test router (OneDrive → Docker or fail fast) |
| `npm run test:docker` | Optional: Vitest in Node 20 container (same as CI) |
| `npm run test:e2e` | Run Playwright E2E tests (mock mode build) |
| `npm run lint` | ESLint |
| `npm run scrape:ddsfl` | Fetch live DDSFL fixtures + table → `src/data/ddsfl-scrape.json` |
| `npm run scrape:ddsfl:save` | Same, also writes `scraped.json` |
| `npm run sync:ddsfl` | Scrape DDSFL and upsert into Supabase (local manual run; also runs daily via GitHub Actions) |
| `npm run generate:vapid-keys` | Generate web push VAPID key pair |
| `npm run generate:pwa-icons` | Build `logo.png` + PWA icons from `public/logo.svg` |
| `npm run screenshots` | Capture mobile + desktop screenshots |

## DDSFL data

League fixtures and the table are scraped from [ddsfl.co.uk](https://www.ddsfl.co.uk). In mock mode the committed file `src/data/ddsfl-scrape.json` is used. Refresh during the season:

```bash
npm run scrape:ddsfl
```

Active season ID is set in `src/lib/ddsflConstants.ts` (`DDSFL_ACTIVE_SEASON`).

## Testing

**Unit tests (23)** and **E2E tests (17)** run in **GitHub Actions** (`.github/workflows/ci.yml`) on every push/PR to `main`:

- **verify** job — lint, build, Vitest in a `node:20-bookworm-slim` container
- **e2e** job — production build with `VITE_E2E=true`, then Playwright (landing, login, squad, admin, full invite flow)

Local Vitest on Windows OneDrive paths is unreliable (worker timeouts). For day-to-day dev, run `npm run lint` and `npm run build` locally; push to GitHub for tests. Optional: `npm run test:docker` or `npm run test:e2e` before push.

## Roles

| Role | Access |
|------|--------|
| **Player** | Dashboard, fixtures, table, results, stats, player profiles, calendar, availability; change own passcode |
| **Committee** | All admin tools except squad member invites and passcode resets — includes finance, live matchday, fundraisers, lineup, notifications |
| **Admin** | Everything committee has, plus squad member invites, team invite link, approvals, passcode resets, and name edits |

## Project structure

```
src/
  pages/          # Route screens (player + lazy-loaded admin)
  components/     # UI, club, admin, finance components
  hooks/          # Auth and data hooks
  lib/            # API, auth, scraper, mock data
  data/           # Committed DDSFL scrape JSON
e2e/              # Playwright smoke, squad, admin, onboarding specs
supabase-club/
  migrations/     # Database schema (001–028)
  functions/      # Edge functions (send-push)
  seed.sql        # Initial admin account
docs/
  PAGE-COPY.md    # All UI copy
  COPY-RULES.md   # UK English and naming conventions
  INPUT-PLACEHOLDERS.md
  SUPABASE-SETUP.md
  AUDIT.md        # Current project audit
  ROADMAP-99.md   # Roadmap to 99 audit score
```

## Documentation

- [UI copy reference](docs/PAGE-COPY.md)
- [Copy rules](docs/COPY-RULES.md)
- [Input placeholders](docs/INPUT-PLACEHOLDERS.md)
- [Supabase setup guide](docs/SUPABASE-SETUP.md)
- [Project audit](docs/AUDIT.md)
- [Roadmap to 99](docs/ROADMAP-99.md)

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · PWA (Workbox) · Playwright · Vitest · Cheerio (DDSFL scraper)
