# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v2)** — see [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md) for the 90+ plan.  
> **Last updated:** 19 June 2026 · **Commit:** `3296128` on `main`

**Scope:** Full codebase (read-only) + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — 788.42 kB JS (225.37 kB gzip), 38.88 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **5 tests** pass; exit code 1 on Windows (Vitest worker timeout on OneDrive path with spaces) — **CI on Linux should pass**

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 11 Jun 2026 | 77/100 | P0 closed; Vercel live; CI; lineup builder |
| **v2 (this doc)** | **19 Jun 2026** | **79/100** | ConfigRequired diagnostics; legacy WC cleanup |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–010 | ✅ Applied |
| Migration 011 (`lineups`) | ⚠️ **Confirm on production** — in repo; run SQL before using lineup save in prod |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only (`npm run sync:ddsfl`) — not on Vercel |
| DDSFL data in production DB | ✅ Sync script verified (`npm run sync:ddsfl`) |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons (`logo.png`, 192, 512) | ✅ Generated |
| Push notifications (VAPID + edge fn) | ❌ Not configured — optional |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment — not treated as launch blockers below.

---

## Changes since audit v1 (77/100)

| Item | Status |
|------|--------|
| Lineup builder committed | ✅ `e565a37` |
| Legacy WC code removed | ✅ |
| White screen on bad/missing Supabase URL | ✅ `636e27c` |
| ConfigRequired env diagnostics | ✅ `3296128` |
| Migration 011 on production | ⚠️ Confirm with operator |
| E2E tests | ❌ Open |
| Accessibility pass | ❌ Open |
| Scheduled DDSFL sync | ❌ Open |
| GK clean-sheet fix | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **79 / 100** *(+2)* |
| **Overall rating** | **Good — squad-ready; polish needed for 90+** |
| **Previous score** | 77 / 100 (audit v1, 11 Jun 2026) |
| **Public-launch equivalent** | ~64 / 100 (auth/testing gaps would matter more) |

Since the last audit, the lineup builder and legacy World Cup code are committed, production env handling is much stronger (`ConfigRequired` diagnostics, malformed-URL guard), and the repo is clean on `main`. The biggest gaps to 90+ are **accessibility**, **test depth**, **bundle performance**, and **operational automation** (DDSFL sync, migration 011 on prod).

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 81 | +3 | Good |
| 2 | [Security](#2-security) | 68 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 56 | +1 | Adequate |
| 4 | [Accessibility](#4-accessibility) | 48 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 87 | +5 | Good |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 75 | −1 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 74 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 85 | +1 | Good |
| 9 | [Testing & Reliability](#9-testing--reliability) | 54 | +2 | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 92 | +4 | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 85 | +2 | Good |
| 12 | [Copy & Content](#12-copy--content) | 86 | +3 | Good |

---

## 1. Code Quality & Architecture

**Score: 81 / 100**  
**Rating: Good**

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/` with `clubApi.ts` as the mock/live boundary.
- TypeScript strict mode; Supabase access via RPCs, not ad-hoc table writes from the client.
- Auth split: `AuthProvider.tsx`, `authContext.ts`, `useAuth.ts`, `clubAuth.ts`.
- Domain logic extracted: `playerStats.ts`, `lineupFormations.ts`, `ddsflScraper.ts`.
- Legacy WC `api/` Vercel routes and `supabase/` migrations removed.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No route code splitting — ~788 kB single chunk. |
| Positive | `clubApi.ts` | `isMockDataMode()` pattern keeps demo mode usable without Supabase. |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-squad use**  
*(would be ~45 for a public launch)*

### Strengths
- All writes go through `SECURITY DEFINER` RPCs with session token checks.
- `profiles.passcode_hash` via `pgcrypto`; service role never exposed via `VITE_*`.
- Committee vs admin permissions enforced (`requireAdmin` on user management).
- RLS blocks direct INSERT/UPDATE on fixtures, availability, squad, etc.

### Findings (informational — accepted for BMFC)

| Severity | Location | Issue | Operator stance |
|----------|----------|-------|-----------------|
| Info | `003_passcode_auth.sql` | 4-digit passcode | OK — trusted squad |
| Info | `login_user` RPC | No rate limiting | OK — closed group |
| Info | `AuthProvider` / localStorage | Sessions client-side; logout does not invalidate server token | OK — low threat |
| Info | `reset_user_passcode` | Does not clear `session_token` | OK — admin-only |
| Low | `send-push` edge fn | CORS `*` | Acceptable for squad scale |

### For a public launch (not required now)
Rate limiting, longer passcodes, server-side session invalidation, and formal security review.

---

## 3. Performance

**Score: 56 / 100**  
**Rating: Adequate for team scale**

### Build output
```
dist/assets/index-Bm7GgmPc.js   788.42 kB │ gzip: 225.37 kB
dist/assets/index-BIxhgTHD.css   38.88 kB │ gzip:   7.83 kB
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No lazy routes — large initial bundle; fine for ~25 users on mobile. |
| Low | `LandingHeroBackdrop.tsx` | Canvas animation CPU on landing visit. |
| Positive | `useClubData` hooks | Error states + retry without full page reload. |
| Positive | PWA | Workbox precache; service worker via `injectManifest`. |

---

## 4. Accessibility

**Score: 48 / 100**  
**Rating: Requires Improvement**

### What exists
- Login / invite fields use `htmlFor` + matching `id`.
- Bottom nav: `aria-label`, `aria-expanded` on account menu.
- Calendar month controls: `aria-label` on prev/next.
- Decorative icons marked `aria-hidden` in several components.

### Remaining gaps

| Severity | Issue |
|----------|-------|
| Medium | No skip-to-content link |
| Medium | Passcode inputs not grouped with `aria-labelledby` |
| Low | Formation / lineup pitch slots are visual-only buttons — no `aria-pressed` for selected slot |
| Low | Operator has deprioritised full a11y pass for squad scale |

Touch targets generally meet 44px on primary actions and bottom nav.

---

## 5. User Experience

**Score: 87 / 100**  
**Rating: Good**

### Strengths
- Clear flow: Landing → Login (or invite link) → Dashboard → fixtures / calendar / availability.
- Mobile bottom nav with five primary tabs + account sheet.
- Admin hub covers squad, fixtures, results, training, availability, notifications, lineup picker.
- `DataErrorBanner` with retry — failed loads no longer look like empty data.
- `NotFound` page for bad URLs.
- `ConfigRequired` explains missing Vercel env vars and shows which vars are wrong/missing.

### Findings

| Severity | Issue |
|----------|-------|
| Low | Stats only populate when admin enters match events — not obvious to new players. |
| Low | Push notifications show "not configured" until VAPID setup. |
| Low | DDSFL sync is manual (`npm run sync:ddsfl`) — no in-app "refresh table" for admin. |
| Positive | Lineup builder: tap slot → tap player; formation change with animated positions. |

---

## 6. Data Integrity & Business Logic

**Score: 75 / 100**  
**Rating: Good**

### Strengths
- `aggregatePlayerStats()` correctly counts goals, assists, appearances, MOTM, cards from `match_events`.
- Unit tests cover stats aggregation and DDSFL name parsing (goalscorer edge case).
- Availability enforces one row per player per fixture/training.
- Admin result entry is the source of truth for player stats (DDSFL does not scrape scorers).

### Findings

| Severity | Issue |
|----------|-------|
| Medium | Goalkeeper clean sheets count all completed 0-GA games, not only games GK played (`playerStats.ts:57–59`). |
| Low | Lineup `011` migration must be applied before saved lineups persist in prod. |
| Low | Negative league points allowed (`009`) — matches DDSFL reality but worth knowing. |
| Positive | Cutoff / scoring N/A — club hub has no prediction game logic. |

---

## 7. DDSFL Integration & Data Sync

**Score: 74 / 100**  
**Rating: Good**

| Setting | Value | Notes |
|---------|-------|-------|
| Data source | [ddsfl.co.uk](https://www.ddsfl.co.uk) | Cheerio scraper |
| Active season | `DDSFL_ACTIVE_SEASON = 7` (2025/26) | `ddsflConstants.ts` |
| Mock mode | `src/data/ddsfl-scrape.json` | Committed snapshot |
| Live sync | `npm run sync:ddsfl` | Needs `SUPABASE_SERVICE_ROLE_KEY` locally |
| Vercel cron | None | Operator runs sync manually — fine for weekly league |

### Findings

| Severity | Issue |
|----------|-------|
| Medium | No scheduled sync — table/fixtures go stale until someone runs the script. |
| Low | Scraper brittle to DDSFL HTML changes — mitigated by committed JSON in mock mode. |
| Positive | Sync verified: fixtures, results, league table upsert to Supabase. |
| Positive | `ddsflScraper.test.ts` guards team-name parsing regression. |

---

## 8. Database & Supabase

**Score: 85 / 100**  
**Rating: Good**

| Table | Public read | Notes |
|-------|-------------|-------|
| `fixtures`, `results`, `league_table_cache` | ✅ | DDSFL + manual fixtures |
| `availability`, `squad`, `training_sessions` | ✅ | |
| `profiles` | Partial columns only | Correct |
| `lineups` | ✅ read | Writes via RPC only — **migration 011** |

### Migrations (`supabase-club/migrations/`)

| # | Purpose |
|---|---------|
| 001 | Core schema |
| 002 | Push subscriptions |
| 003 | Passcode auth RPCs |
| 004 | Invite links |
| 005 | Admin tools |
| 006 | Manual fixtures |
| 007 | Training edit/delete |
| 008 | Manual fixture edit |
| 009 | League points (negative allowed) |
| 010 | `pgcrypto` search path fix |
| 011 | **Lineups** — apply before lineup save in prod |

Edge function: `supabase-club/functions/send-push/` (needs VAPID secrets + deploy).

---

## 9. Testing & Reliability

**Score: 54 / 100**  
**Rating: Adequate for team scale**

### What exists

| Area | Coverage |
|------|----------|
| Player stats aggregation | ✅ 2 tests (`playerStats.test.ts`) |
| DDSFL scraper parsing | ✅ 3 tests (`ddsflScraper.test.ts`) |
| CI pipeline | ✅ Lint → build → `test:ci` on push/PR |

### Gaps

| Severity | Issue |
|----------|-------|
| Medium | No component / E2E tests (login, availability, admin results, lineup). |
| Medium | No integration tests against live Supabase RPCs. |
| Low | Vitest **flakes on Windows** when path contains spaces — worker timeout; `vite.config.ts` uses `maxWorkers: 1`. **GitHub Actions (Linux) should run cleanly.** |
| Positive | `ErrorBoundary` mounted at root (`main.tsx`). |

---

## 10. DevOps & Deployment

**Score: 92 / 100**  
**Rating: Excellent**

| Item | Status |
|------|--------|
| Vercel SPA (`vercel.json` rewrite) | ✅ |
| GitHub repo `lewisjakewhite26/bmfcapp` | ✅ |
| Env vars documented | ✅ README + SUPABASE-SETUP |
| `.env.example` | ✅ |
| **GitHub Actions CI** | ✅ lint, build, test |
| ConfigRequired env diagnostics | ✅ |
| Error monitoring (Sentry) | ❌ Not configured — low priority |
| Automated DDSFL sync cron | ❌ Manual script only |

### CI pipeline

```yaml
# .github/workflows/ci.yml — push/PR to main|master
npm ci → npm run lint → npm run build → npm run test:ci
```

---

## 11. UI & Design Consistency

**Score: 85 / 100**  
**Rating: Good**

Cohesive BMFC brand: glass cards, `brand-blue` / `brand-navy` / `brand-gold`, Figtree + Inter, mobile-first bottom nav. Admin pages share `PageShell`, `Navbar`, `glass-card`, `btn-primary`. Lineup pitch uses readable green gradient with navy slot pills. PWA icons from club crest.

| Severity | Issue |
|----------|-------|
| Low | `logo.png` generated from SVG — fine for PWA; crest is placeholder SVG in repo. |
| Low | Some admin forms still use inline label styles vs shared field component. |

---

## 12. Copy & Content

**Score: 86 / 100**  
**Rating: Good**

Human UK-English copy pass completed; `docs/COPY-RULES.md` and `.cursor/rules/copy-human-tone.mdc` document tone. `docs/PAGE-COPY.md` is the UI reference. Landing, auth, admin, and empty states read naturally.

| Severity | Issue |
|----------|-------|
| Low | README migration list was outdated (001–008 vs 001–011) — fixed in repo cleanup. |

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Medium | Migration 011 not confirmed on prod | Open |
| 2 | Medium | GK clean sheets over-count | Open |
| 3 | Low | Vitest worker timeout on Windows (OneDrive path) | Open — CI OK |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login / invite | Dev bypass / ✅ | ✅ RPC |
| Dashboard, calendar, availability | ✅ | ✅ + error handling |
| DDSFL fixtures & table | ✅ JSON | ✅ after `sync:ddsfl` |
| Squad stats | ✅ Full | ✅ when match events entered |
| Admin CRUD (fixtures, results, training) | ✅ | ✅ |
| Admin users / invites | ✅ | ✅ admin only |
| Lineup builder | ✅ in-memory | ⚠️ needs migration 011 |
| Push notifications | ❌ | ⚠️ VAPID + edge fn deploy |
| Per-player push targeting | ✅ UI | ⚠️ same as push |

---

## Prioritised action list

### P0 — Before live season

*All complete.*

### P1 — Quality (recommended for 90+)

See full phased plan in [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md).

| # | Task | Status |
|---|------|--------|
| 1 | Apply migration **011** (`lineups`) on production Supabase | ⚠️ Confirm |
| 2 | Fix GK clean-sheet logic + unit test | Open |
| 3 | Accessibility pass (skip link, lineup slots, form labels) | Open |
| 4 | E2E tests: login, availability, admin result entry | Open |
| 5 | Docs cleanup (`COPY.md`, README migration count) | ✅ Done |

### P2 — When you have time

1. Route code splitting (Admin routes, Landing).
2. Scheduled DDSFL sync (GitHub Action) — weekly is enough.
3. Empty-state copy on league table / stats when no events entered.
4. Deploy `send-push` + VAPID keys if squad wants notifications.
5. Admin audit log for invite/result/fixture changes.

### P3 — Nice to have

1. In-app "Sync league data" button for admin.
2. Error monitoring if app grows beyond core squad.
3. Consolidate audit docs into single source of truth.

### Explicitly not required (operator decision)

- Login rate limiting / longer passcodes
- Server-side session invalidation on logout
- Full WCAG 2.2 AA certification
- Automated DDSFL sync more than weekly

---

## Summary

For a **closed BMFC squad deployment**, the app is in **strong shape for the 2025/26 season** at **79 / 100**. Since audit v1, lineup builder and legacy cleanup are on `main`, and production env failures now surface clearly via `ConfigRequired`.

The biggest remaining operational steps are **confirm migration 011 on prod**, **fix GK clean-sheet stats**, and follow the [**90+ roadmap**](docs/ROADMAP-90.md). Weak spots — accessibility, E2E coverage, bundle size, manual DDSFL sync — are proportionate to a private ~25-user grassroots app, not squad launch blockers.

If you ever opened this to the public internet, revisit security (passcode strength, rate limiting) and expand test coverage first.

---

*End of Club Hub audit v2. Reflects `main` at `3296128` (19 Jun 2026).*
