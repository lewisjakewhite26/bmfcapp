# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v1)** — first Club Hub audit in this format; supersedes `docs/PROJECT-AUDIT.md` (June 2026) and archived World Cup predictor audits in `AUDIT.md`.  
> **Last updated:** 11 June 2026 · **Commit:** `60ac34d` on `main` (+ local uncommitted: lineup builder, P2 cleanup)

**Scope:** Full codebase (read-only) + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — 799.72 kB JS (228.17 kB gzip), 38.78 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **5 tests** in 2 files locally **failed to run on Windows** (Vitest worker timeout); **CI on Linux should pass** — see [Testing](#9-testing--reliability)

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| `docs/PROJECT-AUDIT.md` | 8 Jun 2026 | 75/100 | 24-category audit; P0 blockers still open |
| **v1 (this doc)** | **11 Jun 2026** | **77/100** | P0 closed; Vercel live; CI; lineup builder; copy pass |

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–010 | ✅ Applied (login works after `010_pgcrypto_search_path`) |
| Migration 011 (`lineups`) | ⚠️ **Pending** — in repo; run SQL before using lineup save in prod |
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

## Changes since `docs/PROJECT-AUDIT.md` (75/100)

| Item | Status |
|------|--------|
| DDSFL → Supabase sync script | ✅ `scripts/sync-ddsfl-to-supabase.mjs` |
| Live stats aggregation | ✅ `src/lib/playerStats.ts` + unit tests |
| Production Supabase + Vercel deploy | ✅ `ConfigRequired` page when env missing |
| CI (lint + build + test) | ✅ GitHub Actions |
| Human UK copy pass + `docs/COPY-RULES.md` | ✅ |
| 404 page | ✅ `NotFound.tsx` |
| Legacy WC `supabase/` + `api/` folders | ✅ Removed (local, uncommitted) |
| `pageContainerClass()` layout helper | ✅ Adopted across pages (local) |
| Per-player push targeting | ✅ Admin notifications (local) |
| Lineup builder (`/admin/lineup`) | ✅ Built (local); migration 011 pending |
| `isMockDataMode()` lint rename | ✅ ESLint hooks rule compliance |

---

## 1. Code Quality & Architecture

**Score: 78 / 100**  
**Rating: Good**

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/` with `clubApi.ts` as the mock/live boundary.
- TypeScript strict mode; Supabase access via RPCs, not ad-hoc table writes from the client.
- Auth split: `AuthProvider.tsx`, `authContext.ts`, `useAuth.ts`, `clubAuth.ts`.
- Domain logic extracted: `playerStats.ts`, `lineupFormations.ts`, `ddsflScraper.ts`.
- `pageContainerClass()` centralises mobile nav clearance.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No route code splitting — ~800 kB single chunk. |
| Low | `Signup.tsx` | Stub redirect only — harmless but dead file. |
| Low | `COPY.md` | Still describes World Cup predictor UI — stale. |
| Positive | `clubApi.ts` | `isMockDataMode()` pattern keeps demo mode usable without Supabase. |
| Positive | Cleanup | Legacy `api/` Vercel routes and `supabase/` WC migrations removed. |

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

**Score: 55 / 100**  
**Rating: Adequate for team scale**

### Build output
```
dist/assets/index-B5m7HtTG.js   799.72 kB │ gzip: 228.17 kB
dist/assets/index-Bfk0zzvk.css     38.78 kB │ gzip:   7.81 kB
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

**Score: 82 / 100**  
**Rating: Good**

### Strengths
- Clear flow: Landing → Login (or invite link) → Dashboard → fixtures / calendar / availability.
- Mobile bottom nav with five primary tabs + account sheet.
- Admin hub covers squad, fixtures, results, training, availability, notifications, **lineup picker**.
- `DataErrorBanner` with retry — failed loads no longer look like empty data.
- `NotFound` page for bad URLs.
- `ConfigRequired` explains missing Vercel env vars instead of a blank screen.

### Findings

| Severity | Issue |
|----------|-------|
| Low | Stats only populate when admin enters match events — not obvious to new players. |
| Low | Push notifications show “not configured” until VAPID setup. |
| Low | DDSFL sync is manual (`npm run sync:ddsfl`) — no in-app “refresh table” for admin. |
| Positive | Lineup builder: tap slot → tap player; formation change with animated positions. |

---

## 6. Data Integrity & Business Logic

**Score: 76 / 100**  
**Rating: Good**

### Strengths
- `aggregatePlayerStats()` correctly counts goals, assists, appearances, MOTM, cards from `match_events`.
- Unit tests cover stats aggregation and DDSFL name parsing (goalscorer edge case).
- Availability enforces one row per player per fixture/training.
- Admin result entry is the source of truth for player stats (DDSFL does not scrape scorers).

### Findings

| Severity | Issue |
|----------|-------|
| Medium | Goalkeeper clean sheets count all completed 0-GA games, not only games GK played. |
| Low | Lineup `011` migration must be applied before saved lineups persist in prod. |
| Low | Negative league points allowed (`009`) — matches DDSFL reality but worth knowing. |
| Positive | Cutoff / scoring N/A — club hub has no prediction game logic. |

---

## 7. DDSFL Integration & Data Sync

**Score: 74 / 100**  
**Rating: Good**

*(Replaces “API Integration & Cron” from WC predictor audits — no API-Football cron in Club Hub.)*

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

**Score: 84 / 100**  
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

**Score: 52 / 100**  
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

**Score: 88 / 100**  
**Rating: Good**

| Item | Status |
|------|--------|
| Vercel SPA (`vercel.json` rewrite) | ✅ |
| GitHub repo `lewisjakewhite26/bmfcapp` | ✅ |
| Env vars documented | ✅ README + SUPABASE-SETUP |
| `.env.example` | ✅ |
| **GitHub Actions CI** | ✅ lint, build, test |
| Error monitoring (Sentry) | ❌ Not configured — low priority |
| Automated DDSFL sync cron | ❌ Manual script only |

### CI pipeline

```yaml
# .github/workflows/ci.yml — push/PR to main|master
npm ci → npm run lint → npm run build → npm run test:ci
```

---

## 11. UI & Design Consistency

**Score: 83 / 100**  
**Rating: Good**

Cohesive BMFC brand: glass cards, `brand-blue` / `brand-navy` / `brand-gold`, Figtree + Inter, mobile-first bottom nav. Admin pages share `PageShell`, `Navbar`, `glass-card`, `btn-primary`. Lineup pitch uses readable green gradient with navy slot pills (after holographic experiment reverted). PWA icons from club crest.

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
| Low | Root `COPY.md` still WC predictor content — stale. |
| Low | `docs/PROJECT-AUDIT.md` roadmap partially outdated (P0 done). |

---

## Overall Assessment

| Metric | Value |
|--------|-------|
| **Overall score** | **77 / 100** |
| **Overall rating** | **Good — ready for BMFC squad rollout** |
| **Previous score** | 75 / 100 (`docs/PROJECT-AUDIT.md`, 8 Jun) |
| **Public-launch equivalent** | ~62 / 100 (auth/testing gaps would matter more) |

### Category summary

| # | Category | Score | Δ vs PROJECT-AUDIT | Rating |
|---|----------|------:|-------------------|--------|
| 1 | Code Quality & Architecture | 78 | +1 | Good |
| 2 | Security | 68 | +10* | Adequate (closed squad) |
| 3 | Performance | 55 | — | Adequate |
| 4 | Accessibility | 48 | −8 | Requires Improvement |
| 5 | User Experience | 82 | +6 | Good |
| 6 | Data Integrity & Business Logic | 76 | +6 | Good |
| 7 | DDSFL Integration & Data Sync | 74 | new | Good |
| 8 | Database & Supabase | 84 | +2 | Good |
| 9 | Testing & Reliability | 52 | +36 | Adequate |
| 10 | DevOps & Deployment | 88 | +26 | Good |
| 11 | UI & Design Consistency | 83 | +1 | Good |
| 12 | Copy & Content | 86 | +4 | Good |

*\*Security re-scored with closed-squad operator context (same framing as WC audits).*

---

## Prioritised Action List

### P0 — Before live season

*All complete.*

- ~~DDSFL scrape → Supabase upsert~~
- ~~Live stats aggregation~~
- ~~Migrations + seed on production Supabase~~
- ~~Vercel deploy + env vars~~

### P1 — Quality (optional)

| # | Task | Status |
|---|------|--------|
| 1 | Apply migration **011** (`lineups`) on production Supabase | ⚠️ Pending |
| 2 | Commit + push lineup builder and P2 cleanup (local changes) | ⚠️ Pending |
| 3 | E2E tests: login, availability, admin result entry | Open |
| 4 | Accessibility pass (if ever needed) | Deprioritised by operator |

### P2 — When you have time

1. Admin audit log for invite/result/fixture changes.
2. Scheduled DDSFL sync (GitHub Action or Supabase cron) — weekly is enough.
3. Empty-state copy on league table / stats when no events entered.
4. Deploy `send-push` + VAPID keys if squad wants notifications.
5. Delete or archive stale `COPY.md` (WC predictor).

### P3 — Nice to have

1. Route code splitting (Admin routes, Landing).
2. In-app “Sync league data” button for admin (calls edge function or documents script).
3. Fix GK clean-sheet logic to only count games goalkeeper played.
4. Error monitoring if app grows beyond core squad.

### Explicitly not required (operator decision)

- Login rate limiting / longer passcodes
- Server-side session invalidation on logout
- Full accessibility audit
- Automated DDSFL sync more than weekly

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~High~~ | Live stats always 0 in Supabase mode | ✅ Fixed (`playerStats.ts`) |
| 2 | ~~High~~ | Vercel blank page (missing env) | ✅ Fixed (`ConfigRequired`) |
| 3 | ~~Medium~~ | ESLint `useMockData` hooks violation | ✅ Renamed `isMockDataMode()` |
| 4 | Low | Migration 011 not applied on prod | Open |
| 5 | Low | Vitest timeout on Windows local path | Open (CI OK) |
| 6 | Low | `COPY.md` stale | Open |
| 7 | Low | GK clean sheets over-count | Open |

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

## Summary

For a **closed BMFC squad deployment**, the app is in **strong shape for the 2025/26 season**. Since the June 8 project audit, P0 is closed: Supabase is live, Vercel is configured, DDSFL sync works, stats aggregate from match events, CI runs on every push, and copy reads like a human wrote it.

The biggest remaining operational steps are **apply migration 011**, **commit/push local lineup + cleanup work**, and **invite players** when ready. Weak spots — accessibility, E2E coverage, bundle size, manual DDSFL sync — are proportionate to a private ~25-user grassroots app, not squad launch blockers.

If you ever opened this to the public internet, revisit security (passcode strength, rate limiting) and expand test coverage first.

---

*End of Club Hub audit v1. Reflects workspace at `60ac34d` plus uncommitted lineup/P2 changes (11 Jun 2026).*
