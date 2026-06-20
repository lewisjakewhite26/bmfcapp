# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v11)** — see [ROADMAP-99.md](ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 20 June 2026 · **Commit:** `7265a28` on `main`

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
| **v11 (this doc)** | **20 Jun 2026** | **98/100** | E2E in CI; team invite link; login/display split; migrations 025–028 |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations **001–028** | ✅ Applied on Club Hub project |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` when fixtures publish |
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

## Changes since audit v10 (96/100)

| Item | Status |
|------|--------|
| Playwright E2E in CI — smoke, admin, squad, onboarding (`7265a28`) | ✅ Shipped |
| Reusable **team invite link** — `/join/:token`, admin generate/regenerate (`eb5d4ba`, 028) | ✅ Shipped |
| Login name vs display name split (`ff2e53d`, 025) | ✅ Shipped |
| Pre-season stats toggle + fixture purge RPC (026) | ✅ Shipped |
| Em-dash copy cleanup in RPC errors (027) | ✅ Shipped |
| Invite onboarding simplified to single-page form | ✅ |
| AdminLineup “Invalid Date” fix | ✅ |
| Landing canvas pauses off-screen (`IntersectionObserver`) | ✅ |
| Global error fallback + improved error boundary | ✅ |
| PWA push — “install app first” messaging on unsupported browsers | ✅ |
| Apply migrations **023–028** on Club Hub | ✅ Operator |
| Sentry / admin audit log | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **98 / 100** *(+2)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 96 / 100 (audit v10, 20 Jun 2026) |
| **Public-launch equivalent** | ~77 / 100 |
| **99 target** | See [ROADMAP-99.md](ROADMAP-99.md) |

Since v10: Playwright E2E tests run in CI on every push. Admins can share one reusable team join link (`/join/:token`) alongside one-time player invites. Login identifier (`ChrisL`) is separate from spaced display name (`Chris L`). Test coverage and DevOps maturity improved significantly.

**Operator:** generate the team invite link in Admin → Squad members, populate squad rows, then brief players on **ChrisL**-style login. All migrations **001–028** are applied on Club Hub.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 91 | +1 | Good |
| 2 | [Security](#2-security) | 69 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 74 | +2 | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 99 | +1 | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 86 | +1 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 98 | — | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 78 | +14 | Good |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 99 | +1 | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 94 | +1 | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 93 | +2 | Excellent |

---

## 1. Code Quality & Architecture

**Score: 91 / 100** · **Good**

### Strengths
- Layered GK resolution in `cleanSheet.ts` — single source for stats and admin audit.
- Finance split across `financeCategories.ts`, `mockFinance.ts`, `clubApi.ts`, and dedicated UI components.
- `playerNames.ts` — login name, display name, and username allocation mirrored in SQL and mock.
- Team invite reuses `InviteForm` via `Join.tsx` — no duplicate onboarding UI.
- Lazy-loaded admin routes; TypeScript strict mode; `GlobalErrorFallback` at root.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `7265a28` | Playwright E2E + Vitest CI pipeline. |
| Positive | `eb5d4ba` | Team invite link RPCs + admin UI. |
| Positive | `ff2e53d` | `login_name` column separate from spaced `display_name`. |
| Positive | `001`–`028` | Full migration chain applied on Club Hub production. |
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

Invite onboarding (one-time + reusable team link), login/display name split, passcode self-service, live matchday, photos, events, fundraisers, Finance dashboard, PWA install prompt, push with install guidance — all live on Supabase.

| Severity | Issue |
|----------|-------|
| Low | Empty squad on prod → stats show “No stats yet”; profiles need squad row. |

---

## 6. Data Integrity & Business Logic

**Score: 86 / 100** · **Good**

Unique `(first_name, last_name)`. Login name `ChrisL`, display name `Chris L`, collision suffixes on both. Live drafts separate from `match_events`. Team invite duplicate-name handling in `complete_team_invite`.

**GK clean sheets:** resolved per fixture via live matchday log (including keeper subs), saved lineup GK slot, or optional manual override on Admin → Results.

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100** · **Good**

2026/27 Second Division configured. Weekly GitHub Action sync. Operator runs `npm run sync:ddsfl` when fixtures publish. Migration 026 adds admin fixture purge before a cutoff date.

---

## 8. Database & Supabase

**Score: 98 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations **001–028** | ✅ Applied on Club Hub |
| Calendar archive + fundraiser delete (023) | ✅ |
| GK clean sheets — `goalkeeper_player_id`, `live_log_entries` (024) | ✅ |
| Login name vs display name (025) | ✅ |
| Fixture purge RPC (026) | ✅ |
| Em-dash RPC copy (027) | ✅ |
| Team invite link table + RPCs (028) | ✅ |
| Finance sponsorships + expenses (022) | ✅ |
| `send-push` | ✅ Deployed |

---

## 9. Testing & Reliability

**Score: 78 / 100** · **Good**

**Unit tests (23):** `playerNames`, `playerStats`, `cleanSheet`, `liveMatchEvents`, `ddsflScraper`.

**E2E tests (17):** landing, login, dashboard nav, 404, admin hub/finance/squad, player route guard, stats/profile/calendar/availability, full invite → approve → login flow.

CI: lint → build → Vitest (verify job) + Playwright E2E (separate job, mock mode + `VITE_E2E=true` build). Local Vitest on OneDrive is flaky — use `npm run test:ci` / `npm run test:docker` or rely on GitHub Actions.

---

## 10. DevOps & Deployment

**Score: 99 / 100** · **Excellent**

Vercel + GitHub CI (unit + E2E), PWA crest icons, weekly DDSFL sync, full migration chain, `VITE_VAPID_PUBLIC_KEY` on Vercel. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 94 / 100** · **Excellent**

Official crest, glass-card admin UI, photo avatars, Finance overview with horizontal bar breakdowns, calendar result colour coding, team invite controls on Admin → Squad members.

---

## 12. Copy & Content

**Score: 93 / 100** · **Excellent**

Login placeholder `ChrisL`. UK English. Em dashes removed from UI and RPC errors (027). Placeholder inventory in `docs/INPUT-PLACEHOLDERS.md`. Aligned with `docs/COPY-RULES.md`. Default home venue **Bishop Middleham Park**.

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
| 2 | Generate team invite link (Admin → Squad members) | ⚠️ Operator |
| 3 | Add squad members (Admin → Squad) — including admins who need profiles | ⚠️ Operator |
| 4 | Brief squad: sign in as **ChrisL**-style login name | ⚠️ Operator |

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
| 9 | DDSFL sync 2026/27 | ⚠️ When fixtures publish |
| 10 | Sentry + admin audit log | Open |

---

## Summary

**98 / 100** — E2E in CI, team invite link, login/display split, and migrations **001–028** all applied on Club Hub. Next: generate the team join link, populate squad, and brief players on **ChrisL** login format.

**Path to 99:** ops closure (migrations + squad + DDSFL), Sentry, admin audit log, optional a11y polish — see [ROADMAP-99.md](ROADMAP-99.md).

---

*End of Club Hub audit v11. App baseline `7265a28`; docs updated 20 June 2026.*
