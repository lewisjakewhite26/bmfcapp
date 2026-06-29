# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v12)** — see [ROADMAP-99.md](ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 21 June 2026 · **Commit:** `317875d` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~661 kB JS (~185 kB gzip main chunk), admin routes lazy-loaded  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** **23** unit tests (Vitest) + **17** E2E tests (Playwright); GitHub Actions CI — verify job + e2e job on every push to `main`

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
| v7 | 20 Jun 2026 | 93/100 | Prod bug fixes; ChrisL format; photo_url grant; migrations 019–021 |
| v8 | 20 Jun 2026 | 94/100 | Finance admin — sponsorships, expenses, ledger dashboard; migration 022 |
| v9 | 20 Jun 2026 | 95/100 | All migrations 001–022 applied on Club Hub |
| v10 | 20 Jun 2026 | 96/100 | GK clean sheets; calendar archive; PWA install prompt; migrations 023–024 |
| **v11** | 20 Jun 2026 | 98/100 | E2E in CI; team invite link; login/display split; migrations 025–028 |
| **v12 (this doc)** | **21 Jun 2026** | **98/100** | Admin fines (032–035); late-fee automation; player `/fines` built but hidden |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations **001–028** | ✅ Applied on Club Hub project |
| Supabase migrations **032–035** (fines) | ⚠️ Apply **032–035** on Club Hub if not already (032 core, 033 delete, 034 late fees, 035 auto title) |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel; ⚠️ also needed as GitHub Actions secret for nightly DDSFL + late-fee workflows |
| DDSFL data in production DB | ⚠️ Nightly **Sync DDSFL to Supabase** fails until GitHub secrets set; local `npm run sync:ddsfl` OK |
| Admin fines (log + payments) | ✅ Shipped — `/admin/fines`, migrations **032+** |
| Player fines page (`/fines`) | ⚠️ Built (`Fines.tsx`) — route hidden until release (Phase 6g) |
| Monthly £2 late-fee automation | ✅ Migration **034** + GitHub Action `apply-fine-late-fees.yml` (daily 00:05 UTC) |
| Production `squad` table populated | ⚠️ Add players via Admin → Squad (required for stats/profiles) |
| Admin accounts (DanJ, JordanC, etc.) | ✅ Created — passcode **0000** until changed |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ Lint, build, Vitest, Playwright E2E |
| PWA icons | ✅ Official club crest |
| PWA “Add to home screen” prompt | ✅ Dashboard banner + navbar install button |
| Push notifications | ✅ Edge fn + Vercel VAPID key; install required on iOS |
| `send-push` edge function | ✅ Deployed to Club Hub |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. Players can change their own passcode; admin reset remains for forgotten codes.

**Onboarding note:** Players sign in with **login name** (e.g. **`ChrisL`** — no space). The app shows **display name** elsewhere (e.g. **`Chris L`**). One-time invites use `/invite/:token`; reusable squad link uses `/join/:token` (migration 028). Approval still required after sign-up.

---

## Changes since audit v11 (98/100)

| Item | Status |
|------|--------|
| **Admin fines** — log by date, squad grid, picker modal, grouped payments tab (`AdminFines.tsx`, **032**) | ✅ Shipped |
| Fine session delete RPC (**033**) | ✅ Shipped |
| **Automatic £2/month late fees** — `apply_fine_late_fees()`, idempotent runs table (**034**) | ✅ Shipped |
| Date-only event create — auto title from date (**035**) | ✅ Shipped in code; ⚠️ apply migration on Supabase |
| Admin fines UX redesign — collapsed create form, payment cards, confirm dialogs, calmer pulse | ✅ `b55cc89` |
| Event-based copy (dates not “sessions”); scroll preserved on save | ✅ `317875d` |
| Player `/fines` page — squad owed list, your balance card, how-to-pay note | ✅ Built; **hidden** (no route/nav yet) |
| `FineAlertBanner` + `finePlayerCopy.ts` for dashboard release | ✅ Ready; not wired |
| Auto push when player fined | ❌ Open (Phase 6g) |
| GitHub Actions secrets for DDSFL sync | ⚠️ Operator — nightly workflow failing |
| Sentry / admin audit log | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **98 / 100** *(unchanged)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 98 / 100 (audit v11, 20 Jun 2026) |
| **Public-launch equivalent** | ~77 / 100 |
| **99 target** | See [ROADMAP-99.md](ROADMAP-99.md) — Sentry, audit log, player `/fines` release, ops closure |

Since v11: full **admin fines** system shipped — log fines by date, mark payments, grouped payment view, preset catalogue + one-offs, session delete, and automated **£2/month late fees** after the last Sunday deadline. Player-facing fines UI is built (squad owed list + personal balance) but deliberately **hidden** until committee release. Migrations **032–035** extend the schema; operator must ensure all are applied and GitHub Actions secrets are set for automated sync jobs.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 92 | +1 | Good |
| 2 | [Security](#2-security) | 69 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 74 | — | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 99 | — | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 88 | +2 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 99 | +1 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 78 | — | Good |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 99 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 95 | +1 | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 94 | +1 | Excellent |

---

## 1. Code Quality & Architecture

**Score: 92 / 100** · **Good**

### Strengths
- Layered GK resolution in `cleanSheet.ts` — single source for stats and admin audit.
- Finance split across `financeCategories.ts`, `mockFinance.ts`, `clubApi.ts`, and dedicated UI components.
- **Fines module** — `fineCatalog.ts`, `fineAlerts.ts`, `finePaymentGroups.ts`, `finePlayerCopy.ts`; UI in `components/fines/`; admin page lazy-loaded.
- `playerNames.ts` — login name, display name, and username allocation mirrored in SQL and mock.
- Team invite reuses `InviteForm` via `Join.tsx` — no duplicate onboarding UI.
- Lazy-loaded admin routes; TypeScript strict mode; `GlobalErrorFallback` at root.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `032`–`035` | Fines schema, delete, late fees, auto title RPCs. |
| Positive | `AdminFines.tsx` | Log + payments tabs; silent refresh on save. |
| Positive | `7265a28` | Playwright E2E + Vitest CI pipeline. |
| Positive | `eb5d4ba` | Team invite link RPCs + admin UI. |
| Positive | `001`–`028` | Core migration chain applied on Club Hub production. |
| Low | Fines | No unit tests for `fineAlerts` / payment grouping yet. |
| Low | Finance | No unit tests for overview calculations yet. |
| Low | E2E | Team join link flow not yet covered in Playwright. |

---

## 2. Security

**Score: 69 / 100** · **Adequate for closed-squad use** *(~46 public-launch equivalent)*

RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. Team invite still requires admin approval. Finance uses `assert_finance_user` — admin **or** committee; `logged_by` / `edited_by` set server-side from session, never client-supplied.

---

## 3. Performance

**Score: 74 / 100** · **Good for team scale**

Main chunk ~661 kB / ~185 kB gzip. Admin routes lazy-loaded. Landing canvas animation pauses when hero is off-screen via `IntersectionObserver`.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

Invite first/last name fields and change-passcode labels in place. Finance forms use standard labels. Broader pass deferred — ROADMAP-99 Phase 9.

---

## 5. User Experience

**Score: 99 / 100** · **Excellent**

Invite onboarding (one-time + reusable team link), login/display name split, passcode self-service, live matchday, photos, events, fundraisers, Finance dashboard, **admin fines** (log by date, mark paid, grouped payments), PWA install prompt, push with install guidance — all live on Supabase. Player `/fines` page built but not routed yet.

| Severity | Issue |
|----------|-------|
| Low | Empty squad on prod → stats show “No stats yet”; profiles need squad row. |
| Low | Player fines hidden — squad cannot self-serve owed list until Phase 6g release. |

---

## 6. Data Integrity & Business Logic

**Score: 88 / 100** · **Good**

Unique `(first_name, last_name)`. Login name `ChrisL`, display name `Chris L`, collision suffixes on both. Live drafts separate from `match_events`. Team invite duplicate-name handling in `complete_team_invite`.

**GK clean sheets:** resolved per fixture via live matchday log (including keeper subs), saved lineup GK slot, or optional manual override on Admin → Results.

**Fines:** `fine_sessions` + `fine_entries` with RPC-gated admin writes. Results sync skips fixtures where admin has entered match events. **Late fees:** £2 per player per billing month after last-Sunday deadline; idempotent via `fine_late_fee_runs` + daily GitHub Action. Payment mark-all-paid respects grouped entries; scrape sync does not overwrite admin-entered results.

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100** · **Good**

2026/27 Second Division configured. Daily GitHub Action sync (20:00 UTC) — **currently failing** until `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set as repo secrets. Operator can run `npm run sync:ddsfl` locally. Migration 026 adds admin fixture purge before a cutoff date. Pre-season: 0 BMFC fixtures on DDSFL for season 8; league table sync still works.

---

## 8. Database & Supabase

**Score: 99 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations **001–028** | ✅ Applied on Club Hub |
| **Fines — core schema + RPCs (032)** | ✅ Shipped |
| **Fines — session delete (033)** | ✅ Shipped |
| **Fines — late fees + runs table (034)** | ✅ Shipped |
| **Fines — auto title from date (035)** | ⚠️ Apply on Club Hub if not done |
| Calendar archive + fundraiser delete (023) | ✅ |
| GK clean sheets — `goalkeeper_player_id`, `live_log_entries` (024) | ✅ |
| Login name vs display name (025) | ✅ |
| Fixture purge RPC (026) | ✅ |
| Em-dash RPC copy (027) | ✅ |
| Team invite link table + RPCs (028) | ✅ |
| Finance sponsorships + expenses (022) | ✅ |
| `send-push` | ✅ Deployed |
| `apply-fine-late-fees` edge fn + Action | ✅ Shipped |

---

## 9. Testing & Reliability

**Score: 78 / 100** · **Good**

**Unit tests (23):** `playerNames`, `playerStats`, `cleanSheet`, `liveMatchEvents`, `ddsflScraper`. **No fines tests yet.**

**E2E tests (17):** landing, login, dashboard nav, 404, admin hub/finance/squad, player route guard, stats/profile/calendar/availability, full invite → approve → login flow. **Admin fines not in E2E yet.**

CI: lint → build → Vitest (verify job) + Playwright E2E (separate job, mock mode + `VITE_E2E=true` build). Local Vitest on OneDrive is flaky — use `npm run test:ci` / `npm run test:docker` or rely on GitHub Actions.

---

## 10. DevOps & Deployment

**Score: 99 / 100** · **Excellent**

Vercel + GitHub CI (unit + E2E), PWA crest icons, **two scheduled Actions** (DDSFL sync 20:00 UTC, fine late fees 00:05 UTC), full migration chain through **035**, `VITE_VAPID_PUBLIC_KEY` on Vercel. **GitHub Actions secrets** required for both sync jobs. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 95 / 100** · **Excellent**

Official crest, glass-card admin UI, photo avatars, Finance overview with horizontal bar breakdowns, calendar result colour coding, team invite controls on Admin → Squad members. **Admin fines** — date list, squad grid with owed totals, bottom-sheet picker modal, grouped payment cards with mark-paid pulse.

---

## 12. Copy & Content

**Score: 94 / 100** · **Excellent**

Login placeholder `ChrisL`. UK English. Em dashes removed from UI and RPC errors (027). Fines use **event/date** wording (not “sessions”); player copy in `finePlayerCopy.ts` (committee voice, no “pay up”). Placeholder inventory in `docs/INPUT-PLACEHOLDERS.md`. Aligned with `docs/COPY-RULES.md`. Default home venue **Bishop Middleham Park**.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ |
| 2 | ~~Medium~~ | GK clean sheets over-count | ✅ `ed6bde1`, migration 024 |
| 3 | ~~Low~~ | Vitest worker timeout (Windows/OneDrive) | ✅ CI container; `test:ci` locally |
| 4 | ~~Low~~ | Placeholder crest | ✅ |
| 5 | ~~Low~~ | Push without Vercel VAPID | ✅ |
| 6 | ~~Medium~~ | Stale fixtures in upcoming | ✅ |
| 7 | ~~Medium~~ | Live match lost on crash | ✅ |
| 8 | ~~Medium~~ | Admin pre-entered name on invite | ✅ v6 |
| 9 | ~~Low~~ | Migration 019 GRANT ambiguous | ✅ |
| 10 | ~~High~~ | Dashboard/calendar 400 — match_events embed | ✅ `7189fcc` |
| 11 | ~~Medium~~ | Stats 400 — `photo_url` not granted | ✅ 021 |
| 12 | ~~Low~~ | AdminLineup “Invalid Date” | ✅ `7265a28` |
| 13 | ~~Medium~~ | No E2E tests | ✅ `7265a28` |
| 14 | Low | Empty production squad → no stats/profiles | ⚠️ Ops — add via Admin |
| 15 | ~~Low~~ | Migrations 023–028 not yet on prod | ✅ Operator |
| 16 | Low | GitHub Actions secrets missing → DDSFL sync fails nightly | ⚠️ Operator |
| 17 | Low | Player `/fines` built but route hidden | ⚠️ Phase 6g release |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login (login name + passcode) | Dev bypass / ✅ | ✅ |
| One-time invite (`/invite/:token`) | ✅ | ✅ |
| Team invite link (`/join/:token`) | ✅ | ✅ |
| Change own passcode | ✅ | ✅ |
| Dashboard / calendar | ✅ | ✅ |
| Squad stats (GK clean sheets) | ✅ | ✅ (needs squad rows) |
| Player profile | ✅ | ✅ (needs squad row) |
| Admin live matchday | ✅ | ✅ |
| Admin finance (sponsorships + expenses) | ✅ | ✅ |
| **Admin fines** (log + mark paid) | ✅ | ✅ (migrations **032+**) |
| **Player fines** (`/fines` owed list) | ✅ | ⚠️ Built; route hidden |
| **Late fee automation** (£2/month) | — | ✅ (**034** + daily Action) |
| Admin → Results manual GK | ✅ | ✅ |
| Calendar archive (events/fundraisers) | ✅ | ✅ |
| Push notifications | ✅ | ✅ |
| PWA install prompt | ✅ | ✅ |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **001–028** on Club Hub | ✅ |
| 2 | Apply migrations **032–035** (fines) on Club Hub | ⚠️ Operator |
| 3 | Generate team invite link (Admin → Squad members) | ⚠️ Operator |
| 4 | Add squad members (Admin → Squad) — including admins who need profiles | ⚠️ Operator |
| 5 | Brief squad: sign in as **ChrisL**-style login name | ⚠️ Operator |
| 6 | GitHub Actions secrets for DDSFL + late-fee workflows | ⚠️ Operator |

### P1 — Path to 99

See [ROADMAP-99.md](ROADMAP-99.md).

| # | Task | Status |
|---|------|--------|
| 1 | Onboarding + prod bug fixes | ✅ |
| 2 | Finance admin | ✅ |
| 3 | GK clean-sheet fix | ✅ |
| 4 | Calendar archive + result colours | ✅ |
| 5 | E2E tests in CI | ✅ |
| 6 | Team invite link | ✅ |
| 7 | Vercel VAPID on production | ✅ |
| 8 | Push smoke test (Admin → Notifications) | ⚠️ Optional |
| 9 | **Admin fines** (log + payments + late fees) | ✅ |
| 10 | **Player `/fines` release** + auto push when fined | Open |
| 11 | DDSFL sync 2026/27 + GitHub secrets | ⚠️ Operator |
| 12 | Sentry + admin audit log | Open |

---

## Summary

**98 / 100** — Admin fines shipped (migrations **032–035**, late-fee automation, redesigned admin UX). Player `/fines` built but hidden. E2E in CI, team invite link, and migrations **001–028** remain applied on Club Hub.

**Operator:** apply **032–035** if not done, set GitHub Actions secrets, generate team join link, populate squad, brief players on **ChrisL** login.

**Path to 99:** player fines release, auto push on new fines, ops closure (DDSFL secrets + sync), Sentry, admin audit log — see [ROADMAP-99.md](ROADMAP-99.md).

---

*End of Club Hub audit v12. App baseline `317875d`; docs updated 21 June 2026.*
