# BMFC Club Hub

Squad app for **Bishop Middleham FC** — fixtures, league table, stats, calendar, and availability. Built with React, Vite, Tailwind, and Supabase.

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
3. Follow **[docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)** to run migrations, seed the admin, and deploy the push function
4. Restart `npm run dev` after changing env vars

### Deploy on Vercel

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_CLUB_DATA_SOURCE=supabase` under **Environment Variables**, then redeploy. See [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md#vercel-bmfcapp).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest |
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

## Roles

| Role | Access |
|------|--------|
| **Player** | Dashboard, fixtures, stats, calendar, availability |
| **Committee** | Admin tools: squad list, fixtures, results, training, availability overview, notifications |
| **Admin** | Everything committee has, plus squad member invites, approvals, and passcode resets |

## Project structure

```
src/
  pages/          # Route screens
  components/     # UI + club + admin components
  hooks/          # Auth and data hooks
  lib/            # API, auth, scraper, mock data
  data/           # Committed DDSFL scrape JSON
supabase-club/
  migrations/     # Database schema (001–011)
  functions/      # Edge functions (send-push)
  seed.sql        # Initial admin account
docs/
  PAGE-COPY.md    # All UI copy
  SUPABASE-SETUP.md
  ROADMAP-90.md   # Roadmap to 90+ audit score
AUDITNEW.md         # Current project audit
```

## Documentation

- [UI copy reference](docs/PAGE-COPY.md)
- [Supabase setup guide](docs/SUPABASE-SETUP.md)
- [Project audit](AUDITNEW.md)
- [Roadmap to 90+](docs/ROADMAP-90.md)

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · PWA (Workbox) · Cheerio (DDSFL scraper)
