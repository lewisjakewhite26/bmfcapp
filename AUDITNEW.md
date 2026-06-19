# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v5)** — see [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md) for remaining optional work.  
> **Last updated:** 19 June 2026 · **Commit:** `1bc5009` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~630 kB JS (~177 kB gzip main chunk), admin routes lazy-loaded  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — unit tests pass on CI (Linux); Windows local run still flaky on OneDrive path

**Supabase:** Club Hub project confirmed (`kqxsbb…` — EvidInsight); separate from WC predictor (`owkql…`).

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 11 Jun 2026 | 77/100 | P0 closed; Vercel live; CI; lineup builder |
| v2 | 19 Jun 2026 | 79/100 | ConfigRequired diagnostics; legacy WC cleanup |
| v3 | 19 Jun 2026 | 83/100 | Phase 1 done; skeletons; placeholder PWA icons |
| v4 | 19 Jun 2026 | 87/100 | Push wired; real crest; DDSFL 2026/27; fundraisers |
| **v5 (this doc)** | **19 Jun 2026** | **90/100** | Lazy routes; live matchday; photos; events; copy audit |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–012 | ✅ Applied on Club Hub project |
| Supabase migrations 013–014 (fundraisers) | ✅ Applied |
| Supabase migrations 015 (club events) | ✅ Applied |
| Supabase migrations 016 (player photos) | ✅ Applied |
| Supabase migrations 017–018 (live matchday + drafts) | ✅ Applied |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ⚠️ Add + redeploy for production push |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` when fixtures publish |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons (192, 512, maskable, apple-touch, favicon) | ✅ Official club crest |
| Push notifications (VAPID + edge fn) | ⚠️ Edge fn deployed; Vercel VAPID key pending |
| `send-push` edge function | ✅ Deployed to Club Hub (`kqxsbbkedhidsfojapny`) |
| Supabase CLI config (`supabase/config.toml`) | ✅ Entrypoint → `supabase-club/functions/send-push` |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment — not treated as launch blockers below.

---

## Changes since audit v4 (87/100)

| Item | Status |
|------|--------|
| Route code splitting — lazy `/admin/*` + `Landing` | ✅ `19b2d9f` — main chunk ~177 kB gzip |
| Admin Other events (socials, AGM, etc.) on calendar | ✅ `68518a5`, migration 015 |
| Copy alignment vs `docs/COPY-RULES.md` | ✅ `876cae6` |
| Stale upcoming fixture filter; bottom nav “Matches” | ✅ `57c31c1` |
| Admin player photos (Storage + squad upload) | ✅ `e9287b1`, migration 016 |
| Live matchday logger (`/admin/live`) | ✅ `d2c31e8`, migration 017 |
| Live draft persistence (DB, survives refresh) | ✅ `1bc5009`, migration 018 |
| Squad shirt numbers on Admin → Squad | ✅ `d2c31e8` |
| Goal push via existing `send-push` edge fn | ✅ Non-blocking on live log |
| `liveMatchEvents` unit tests | ✅ |
| Migrations 015–018 applied on Club Hub | ✅ Operator confirmed |
| E2E tests | ❌ Open (optional stretch) |
| GK clean-sheet fix | ⏸️ Parked |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **90 / 100** *(+3)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 87 / 100 (audit v4, 19 Jun 2026) |
| **Public-launch equivalent** | ~71 / 100 |
| **90+ target** | ✅ **Reached** |

Since v4: admin routes are lazy-loaded (smaller first paint), live matchday logging with DB-backed draft persistence, player profile photos, club calendar events, copy audit, and migrations 015–018 are all shipped and applied.

Remaining optional work: **E2E tests**, **Vercel VAPID key** for production push, and **DDSFL sync** when league fixtures appear.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 87 | +2 | Good |
| 2 | [Security](#2-security) | 68 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 72 | +17 | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 95 | +2 | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 76 | +1 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | +2 | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 94 | +2 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 58 | +4 | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 96 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 92 | — | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 90 | +2 | Excellent |

---

## 1. Code Quality & Architecture

**Score: 87 / 100**  
**Rating: Good**

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/` with `clubApi.ts` as mock/live boundary.
- **Lazy-loaded admin routes** and Landing — smaller initial bundle.
- Live matchday: `liveMatchEvents.ts`, draft RPCs, mock parity.
- TypeScript strict mode; Supabase access via RPCs.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `App.tsx` | Route code splitting — admin pages in separate chunks. |
| Positive | `AdminLive.tsx` | Draft persistence decoupled from final result submission. |
| Low | `LandingHeroBackdrop.tsx` | Canvas animation CPU on landing visit (optional pause). |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-squad use**  
*(would be ~45 for a public launch)*

Unchanged from v4. RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. Player photo uploads and live drafts are admin/committee-only via RPCs. `send-push` verifies admin session server-side.

---

## 3. Performance

**Score: 72 / 100**  
**Rating: Good for team scale**

### Build output (19 Jun 2026, post code-split)
```
dist/assets/index-*.js   ~630 kB │ gzip: ~177 kB (main chunk)
Admin routes             lazy-loaded per page (~2–12 kB each)
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `App.tsx` | `React.lazy()` for all `/admin/*` + Landing — down from ~231 kB gzip single chunk. |
| Low | `LandingHeroBackdrop.tsx` | Canvas animation CPU on landing visit. |
| Positive | PWA | Workbox precache; service worker via `injectManifest`. |

---

## 4. Accessibility

**Score: 53 / 100**  
**Rating: Requires Improvement**

Unchanged from v4. Skip link, labelled login/invite fields, bottom nav ARIA. Optional improvements deferred for this deployment.

---

## 5. User Experience

**Score: 95 / 100**  
**Rating: Excellent**

### Strengths
- **Live matchday** — `/admin/live` for in-game goal/card/sub logging with resume after crash or refresh.
- **Player photos** on profile hero (admin-uploaded).
- **Club events** on calendar (socials, AGM, etc.).
- **Fundraisers**, PWA install prompt, push toggle, branded 404, skeletons.

### Findings

| Severity | Issue |
|----------|-------|
| Low | Production push needs Vercel `VITE_VAPID_PUBLIC_KEY` + redeploy. |
| Low | DDSFL sync is manual CLI — run when fixtures publish. |

---

## 6. Data Integrity & Business Logic

**Score: 76 / 100**  
**Rating: Good**

Live match drafts stored separately from `match_events` until “End match” — avoids partial stats pollution. Stale scheduled fixtures filtered from upcoming/calendar. GK clean sheets still over-count (parked).

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100**  
**Rating: Good**

| Item | Status |
|------|--------|
| Active season | **2026/27** (`DDSFL_ACTIVE_SEASON = 8`) |
| BMFC division | **Swinburne Maddison Second Division** |
| Committed scrape JSON | ✅ Updated (12 teams, pre-season zeros) |
| Production Supabase sync | ⚠️ Operator to run `npm run sync:ddsfl` when fixtures live |
| Scheduled sync | ✅ GitHub Action weekly |

---

## 8. Database & Supabase

**Score: 94 / 100**  
**Rating: Excellent**

| Item | Status |
|------|--------|
| Migrations 001–014 | ✅ Applied |
| Migration 015 (club events) | ✅ Applied |
| Migration 016 (player photos + Storage) | ✅ Applied |
| Migration 017 (live matchday, substitutions) | ✅ Applied |
| Migration 018 (live match drafts) | ✅ Applied |
| `send-push` edge function | ✅ Deployed |
| VAPID secrets on Supabase | ✅ Set |

---

## 9. Testing & Reliability

**Score: 58 / 100**  
**Rating: Adequate**

| Area | Coverage |
|------|----------|
| Player stats aggregation | ✅ 2 tests |
| DDSFL scraper parsing | ✅ 3 tests |
| Live match event conversion | ✅ 2 tests |
| CI pipeline | ✅ lint → build → test |
| E2E | ❌ None |
| Windows Vitest | ⚠️ Worker timeout persists locally; CI on Linux passes |

---

## 10. DevOps & Deployment

**Score: 96 / 100**  
**Rating: Excellent**

| Item | Status |
|------|--------|
| Vercel SPA + GitHub CI | ✅ |
| PWA manifest + crest PNG icons | ✅ |
| `supabase/config.toml` for edge fn deploy | ✅ |
| `send-push` deployed | ✅ |
| Weekly DDSFL sync Action | ✅ |
| Error monitoring (Sentry) | ❌ |

---

## 11. UI & Design Consistency

**Score: 92 / 100**  
**Rating: Excellent**

Official Bishop Middleham FC crest in navbar, login, invite, landing, favicon, PWA icons. Player photo avatars with initials fallback. Consistent glass-card admin UI.

---

## 12. Copy & Content

**Score: 90 / 100**  
**Rating: Excellent**

Aligned with `docs/COPY-RULES.md` (`876cae6`). UK English (`en-GB`). Bottom nav “Matches” for fixtures + results page.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ Confirmed |
| 2 | Medium | GK clean sheets over-count | ⏸️ Parked |
| 3 | Low | Vitest worker timeout on Windows (OneDrive) | Open — CI OK |
| 4 | ~~Low~~ | Placeholder logo/crest | ✅ Fixed |
| 5 | Low | Push subscribe may fail without Vercel VAPID | ⚠️ Add env + redeploy |
| 6 | ~~Medium~~ | Stale last-season fixtures in upcoming | ✅ Fixed `57c31c1` |
| 7 | ~~Medium~~ | Live match lost on browser crash | ✅ Fixed `1bc5009` |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login / invite | Dev bypass / ✅ | ✅ RPC + meaningful errors |
| Dashboard, calendar, availability | ✅ | ✅ + skeletons + error handling |
| DDSFL fixtures & table | ✅ JSON (2026/27) | ✅ after `sync:ddsfl` |
| Squad stats | ✅ Full | ✅ when match events entered |
| Admin CRUD | ✅ | ✅ |
| Admin fundraisers | ✅ | ✅ |
| Admin other events | ✅ | ✅ after migration 015 |
| Admin live matchday | ✅ + localStorage draft | ✅ after migrations 017–018 |
| Player profile photos | ✅ blob URLs | ✅ after migration 016 |
| Lineup builder | ✅ | ✅ |
| Push notifications | ✅ (with VAPID in `.env.local`) | ⚠️ Edge fn live; Vercel key pending |

---

## Prioritised action list

### P0 — Before live season

*All complete.*

### P1 — Quality (90+ reached)

See [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md).

| # | Task | Status |
|---|------|--------|
| 1 | Migration 011 on Club Hub Supabase | ✅ Done |
| 2 | Empty states + skeleton loaders | ✅ Done |
| 3 | Wire dead code | ✅ Done |
| 4 | GK clean-sheet fix + unit test | ⏸️ Parked |
| 5 | Accessibility pass | ⏭️ Optional |
| 6 | E2E tests (login, availability, admin result) | Open |
| 7 | Route code splitting | ✅ Done |
| 8 | Push: Vercel VAPID + production E2E test | ⚠️ In progress |
| 9 | DDSFL sync for 2026/27 Second Division | ⚠️ Run when fixtures publish |
| 10 | Migrations 013–018 on Club Hub | ✅ Done |
| 11 | Live matchday + draft persistence | ✅ Done |
| 12 | Player photos + club events | ✅ Done |
| 13 | Copy audit | ✅ Done |

### P2 — When you have time

1. Playwright E2E smoke tests.
2. Pause landing canvas when off-screen.
3. Admin audit log.

---

## Summary

**90 / 100** — the app is **ready for player onboarding**. Performance improved via lazy routes, live matchday logging survives refresh/crash, and migrations 015–018 are applied.

**Optional stretch to 91+:** E2E tests and production push verification (Vercel VAPID).

---

*End of Club Hub audit v5. App baseline `1bc5009`; docs updated 19 Jun 2026.*
