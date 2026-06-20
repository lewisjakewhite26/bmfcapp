# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v7)** — see [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 20 June 2026 · **Commit:** `f91371c` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~637 kB JS (~179 kB gzip main chunk), admin routes lazy-loaded  
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
| v5 | 19 Jun 2026 | 90/100 | Lazy routes; live matchday; photos; events; copy audit |
| v6 | 20 Jun 2026 | 92/100 | Onboarding rework; passcode self-service; migration 019 |
| **v7 (this doc)** | **20 Jun 2026** | **93/100** | Prod bug fixes; ChrisL format; photo_url grant; migrations 019–021 |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–018 | ✅ Applied on Club Hub project |
| Supabase migration 019 (names + passcode + invite rework) | ⚠️ Apply / verify on Club Hub (3-arg DROP + explicit GRANTs) |
| Supabase migration 020 (display name **ChrisL** format) | ⚠️ Apply on Club Hub |
| Supabase migration 021 (`photo_url` column grant) | ⚠️ Apply on Club Hub — fixes squad stats load error |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ⚠️ Add + redeploy for production push |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` when fixtures publish |
| Production `squad` table populated | ⚠️ Add players via Admin → Squad (required for stats/profiles) |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons | ✅ Official club crest |
| Push notifications | ⚠️ Edge fn deployed; Vercel VAPID key pending |
| `send-push` edge function | ✅ Deployed to Club Hub |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. Players can change their own passcode; admin reset remains for forgotten codes.

**Onboarding note:** Login uses **display name** (e.g. **`ChrisL`** for Chris Lee). Single-name accounts (e.g. `Lewis`) unchanged. Full first/last name stored internally for admin.

---

## Changes since audit v6 (92/100)

| Item | Status |
|------|--------|
| Fix dashboard/calendar 400 — ambiguous `match_events` → `profiles` embed | ✅ `7189fcc` |
| Display name format **ChrisL** (no space, no period) | ✅ `8d092a8`, migration 020 |
| Fix squad stats 400 — grant `profiles.photo_url` read | ✅ `f91371c`, migration 021 |
| Fundraisers on calendar skip admin RPC for regular players | ✅ `7189fcc` |
| Player enters name on invite; passcode self-service | ✅ `538e006`, migration 019 |
| E2E tests | ❌ Open |
| GK clean-sheet fix | ⏸️ Parked |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **93 / 100** *(+1)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 92 / 100 (audit v6, 20 Jun 2026) |
| **Public-launch equivalent** | ~73 / 100 |
| **99 target** | See [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md) |

Since v6: production issues from live matchday (dual FK embed) and player photos (missing column grant) are fixed in app + migrations. Display name format updated to **ChrisL**. Operator still needs migrations **019–021** on Supabase and to **populate the squad table** before stats/profiles work.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 89 | +1 | Good |
| 2 | [Security](#2-security) | 69 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 72 | — | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 97 | — | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 80 | +2 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 96 | +1 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 62 | +1 | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 96 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 92 | — | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 91 | — | Excellent |

---

## 1. Code Quality & Architecture

**Score: 89 / 100** · **Good**

### Strengths
- `clubApi.ts` uses explicit PostgREST FK hints for `match_events` player + related player embeds.
- Shared `playerNames.ts` mirrored in SQL and mock.
- Lazy-loaded admin routes; TypeScript strict mode.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `7189fcc` | `profiles!match_events_player_id_fkey` — avoids PGRST201 ambiguity. |
| Positive | `019`–`021` | Migrations cover onboarding, display format, and column grants. |
| Low | `LandingHeroBackdrop.tsx` | Canvas CPU on landing (optional pause). |

---

## 2. Security

**Score: 69 / 100** · **Adequate for closed-squad use** *(~46 public-launch equivalent)*

RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. `change_player_passcode` verifies current code + session. Unique name pair on profiles.

---

## 3. Performance

**Score: 72 / 100** · **Good for team scale**

Main chunk ~637 kB / ~179 kB gzip. Admin routes lazy-loaded. Optional: pause landing canvas off-screen.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

Invite first/last name fields and change-passcode labels in place. Broader pass deferred — ROADMAP-99 Phase 9.

---

## 5. User Experience

**Score: 97 / 100** · **Excellent**

Invite onboarding, **ChrisL** display names, passcode self-service, admin name edit, live matchday, photos, events, fundraisers, PWA.

| Severity | Issue |
|----------|-------|
| Low | Vercel VAPID pending for production push. |
| Low | Empty squad on prod → stats show “No stats yet”; profiles need squad row. |

---

## 6. Data Integrity & Business Logic

**Score: 80 / 100** · **Good**

Unique `(first_name, last_name)`. Display collision suffix `ChrisL2`. Live drafts separate from `match_events`. GK clean sheets over-count (parked).

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100** · **Good**

2026/27 Second Division configured. Weekly GitHub Action sync. Operator runs `npm run sync:ddsfl` when fixtures publish.

---

## 8. Database & Supabase

**Score: 96 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations 001–018 | ✅ Applied |
| 019 — invite names, passcode change, admin name edit | ⚠️ Apply / verify |
| 020 — **ChrisL** display name + backfill | ⚠️ Apply |
| 021 — `GRANT SELECT (photo_url)` on profiles | ⚠️ Apply |
| `send-push` | ✅ Deployed |

---

## 9. Testing & Reliability

**Score: 62 / 100** · **Adequate**

Player stats, DDSFL scraper, live match events, and `playerNames` unit tests. CI lint → build → test. No E2E yet. Windows Vitest flaky locally.

---

## 10. DevOps & Deployment

**Score: 96 / 100** · **Excellent**

Vercel + GitHub CI, PWA crest icons, weekly DDSFL sync. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 92 / 100** · **Excellent**

Official crest, glass-card admin UI, photo avatars, pending invite labels in squad admin.

---

## 12. Copy & Content

**Score: 91 / 100** · **Excellent**

Login placeholder `ChrisL`. UK English. Aligned with `docs/COPY-RULES.md`.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ |
| 2 | Medium | GK clean sheets over-count | ⏸️ Parked |
| 3 | Low | Vitest worker timeout (Windows/OneDrive) | Open — CI OK |
| 4 | ~~Low~~ | Placeholder crest | ✅ |
| 5 | Low | Push without Vercel VAPID | ⚠️ |
| 6 | ~~Medium~~ | Stale fixtures in upcoming | ✅ |
| 7 | ~~Medium~~ | Live match lost on crash | ✅ |
| 8 | ~~Medium~~ | Admin pre-entered name on invite | ✅ v6 |
| 9 | ~~Low~~ | Migration 019 GRANT ambiguous | ✅ |
| 10 | ~~High~~ | Dashboard/calendar 400 — match_events embed | ✅ `7189fcc` |
| 11 | ~~Medium~~ | Stats 400 — `photo_url` not granted | ✅ `f91371c` / 021 |
| 12 | Low | Empty production squad → no stats/profiles | ⚠️ Ops — add via Admin |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login (display name + passcode) | Dev bypass / ✅ | ✅ |
| Invite (name on link + passcode) | ✅ | ✅ after 019 |
| Change own passcode | ✅ | ✅ after 019 |
| Dashboard / calendar | ✅ | ✅ after `7189fcc` deploy |
| Squad stats | ✅ | ✅ after 021 + squad rows |
| Player profile | ✅ | ✅ after 021 + squad row |
| Admin live matchday | ✅ | ✅ |
| Push notifications | ✅ (local VAPID) | ⚠️ Vercel key pending |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **019**, **020**, **021** on Club Hub | ⚠️ Operator |
| 2 | Add squad members (Admin → Squad) — including admin if they need a profile | ⚠️ Operator |
| 3 | Brief squad: login as **ChrisL**-style display name | ⚠️ After 020 |

### P1 — Path to 99

See [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md).

| # | Task | Status |
|---|------|--------|
| 1 | Onboarding + prod bug fixes | ✅ `538e006`–`f91371c` |
| 2 | E2E tests | Open |
| 3 | Vercel VAPID + push smoke test | ⚠️ |
| 4 | DDSFL sync 2026/27 | ⚠️ When fixtures publish |
| 5 | GK clean-sheet fix | ⏸️ Parked |

---

## Summary

**93 / 100** — app is production-ready after **migrations 019–021** and **squad setup**. Recent fixes resolved dashboard/calendar and stats load failures on live Supabase.

**Path to 99:** E2E tests, VAPID, DDSFL sync, optional a11y and observability — see [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md).

---

*End of Club Hub audit v7. App baseline `f91371c`; docs updated 20 June 2026.*
