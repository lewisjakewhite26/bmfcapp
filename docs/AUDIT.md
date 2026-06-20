# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v10)** — see [ROADMAP-99.md](ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 20 June 2026 · **Commit:** `ed6bde1` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~657 kB JS (~184 kB gzip main chunk), admin routes lazy-loaded  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **21/21** unit tests; GitHub Actions CI in `node:20-bookworm-slim` container (canonical on OneDrive)

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
| **v10 (this doc)** | **20 Jun 2026** | **96/100** | GK clean sheets; calendar archive; PWA install prompt; migrations 023–024 |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations **001–022** | ✅ Applied on Club Hub project |
| Supabase migrations **023–024** | ⚠️ Apply on Club Hub — calendar archive + GK clean sheets |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` when fixtures publish |
| Production `squad` table populated | ⚠️ Add players via Admin → Squad (required for stats/profiles) |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons | ✅ Official club crest |
| PWA “Add to home screen” prompt | ✅ Dashboard dismissible banner |
| Push notifications | ✅ Edge fn + Vercel VAPID key |
| `send-push` edge function | ✅ Deployed to Club Hub |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. Players can change their own passcode; admin reset remains for forgotten codes.

**Onboarding note:** Login uses **display name** (e.g. **`ChrisL`** for Chris Lee). Single-name accounts (e.g. `Lewis`) unchanged. Full first/last name stored internally for admin.

---

## Changes since audit v9 (95/100)

| Item | Status |
|------|--------|
| GK clean-sheet attribution (`cleanSheet.ts`, migration 024) | ✅ Shipped — live log → lineup → manual override |
| Admin → Results optional goalkeeper field + missing-data banner | ✅ |
| `cleanSheet.test.ts` + updated `playerStats.test.ts` | ✅ |
| Calendar archive vs delete (events/fundraisers, migration 023) | ✅ Shipped |
| Result colour coding on calendar | ✅ |
| PWA “Add to home screen” prompt on dashboard | ✅ |
| Apply migrations **023–024** on Club Hub | ⚠️ Operator |
| E2E tests | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **96 / 100** *(+1)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 95 / 100 (audit v9, 20 Jun 2026) |
| **Public-launch equivalent** | ~76 / 100 |
| **99 target** | See [ROADMAP-99.md](ROADMAP-99.md) |

Since v9: goalkeeper clean sheets now credit only the keeper(s) actually in goal (live log with subs, saved lineup, or manual Admin → Results override). Shutouts without GK data are flagged for admins and do not award credit. Calendar events/fundraisers can be archived rather than deleted. PWA install prompt on dashboard.

**Operator:** apply migrations **023** and **024** on Club Hub Supabase before relying on archive controls or live GK attribution in production.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 90 | — | Good |
| 2 | [Security](#2-security) | 69 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 72 | — | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 98 | — | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 85 | +4 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 98 | — | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 64 | +2 | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 98 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 93 | — | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 91 | — | Excellent |

---

## 1. Code Quality & Architecture

**Score: 90 / 100** · **Good**

### Strengths
- Layered GK resolution in `cleanSheet.ts` — single source for stats and admin audit.
- Finance split across `financeCategories.ts`, `mockFinance.ts`, `clubApi.ts`, and dedicated UI components.
- `clubApi.ts` uses explicit PostgREST FK hints for `match_events` player + related player embeds.
- Shared `playerNames.ts` mirrored in SQL and mock.
- Lazy-loaded admin routes (including `AdminFinance`); TypeScript strict mode.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `ed6bde1` | GK clean sheets via live log / lineup / manual override. |
| Positive | `79c9688` | Finance CRUD via RPCs; mock/live parity. |
| Positive | `7189fcc` | `profiles!match_events_player_id_fkey` — avoids PGRST201 ambiguity. |
| Positive | `001`–`024` | Full migration chain (023–024 pending apply on prod). |
| Low | `LandingHeroBackdrop.tsx` | Canvas CPU on landing (optional pause). |
| Low | Finance | No unit tests for overview calculations yet. |

---

## 2. Security

**Score: 69 / 100** · **Adequate for closed-squad use** *(~46 public-launch equivalent)*

RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. Finance uses `assert_finance_user` — admin **or** committee; `logged_by` / `edited_by` set server-side from session, never client-supplied. Direct table access blocked by RLS.

---

## 3. Performance

**Score: 72 / 100** · **Good for team scale**

Main chunk ~657 kB / ~184 kB gzip. Admin routes lazy-loaded. Optional: pause landing canvas off-screen.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

Invite first/last name fields and change-passcode labels in place. Finance forms use standard labels. Broader pass deferred — ROADMAP-99 Phase 9.

---

## 5. User Experience

**Score: 98 / 100** · **Excellent**

Invite onboarding, **ChrisL** display names, passcode self-service, live matchday, photos, events, fundraisers, Finance dashboard, PWA install prompt — all live on Supabase (023–024 pending apply for archive + GK fields).

| Severity | Issue |
|----------|-------|
| Low | Empty squad on prod → stats show “No stats yet”; profiles need squad row. |

---

## 6. Data Integrity & Business Logic

**Score: 85 / 100** · **Good**

Unique `(first_name, last_name)`. Display collision suffix `ChrisL2`. Live drafts separate from `match_events`. Finance ledger: every sponsorship/expense records creator; edits capture `edited_by` + `edited_at`.

**GK clean sheets:** resolved per fixture via live matchday log (including keeper subs), saved lineup GK slot, or optional manual override on Admin → Results. Shutouts with no GK source are excluded and flagged in Admin → Results. On a 0-GA live-logged match with a keeper substitution, **both keepers are credited**.

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100** · **Good**

2026/27 Second Division configured. Weekly GitHub Action sync. Operator runs `npm run sync:ddsfl` when fixtures publish.

---

## 8. Database & Supabase

**Score: 98 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations **001–022** | ✅ Applied on Club Hub |
| Calendar archive + fundraiser delete (023) | ⚠️ Apply on Club Hub |
| GK clean sheets — `goalkeeper_player_id`, `live_log_entries` (024) | ⚠️ Apply on Club Hub |
| Onboarding, passcode, ChrisL display names (019–020) | ✅ |
| Photo URL grant (021) | ✅ |
| Finance sponsorships + expenses (022) | ✅ |
| `send-push` | ✅ Deployed |

---

## 9. Testing & Reliability

**Score: 64 / 100** · **Adequate**

Player stats, DDSFL scraper, live match events, `playerNames`, and **`cleanSheet`** unit tests (live log, lineup, manual override, no-data cases). CI lint → build → test in isolated Linux container. No E2E yet. Local Vitest on OneDrive not required — rely on GitHub Actions or `npm run test:ci`.

---

## 10. DevOps & Deployment

**Score: 98 / 100** · **Excellent**

Vercel + GitHub CI, PWA crest icons, weekly DDSFL sync, full migration chain on production Supabase, `VITE_VAPID_PUBLIC_KEY` on Vercel. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 93 / 100** · **Excellent**

Official crest, glass-card admin UI, photo avatars, Finance overview with horizontal bar breakdowns (same pattern as Player Profile charts), calendar result colour coding (win teal, loss/draw as before).

---

## 12. Copy & Content

**Score: 91 / 100** · **Excellent**

Login placeholder `ChrisL`. UK English. Finance category labels in `financeCategories.ts`. Aligned with `docs/COPY-RULES.md`.

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
| 12 | Low | Empty production squad → no stats/profiles | ⚠️ Ops — add via Admin |
| 13 | Low | Migrations 023–024 not yet on prod | ⚠️ Operator |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login (display name + passcode) | Dev bypass / ✅ | ✅ |
| Invite (name on link + passcode) | ✅ | ✅ |
| Change own passcode | ✅ | ✅ |
| Dashboard / calendar | ✅ | ✅ |
| Squad stats (GK clean sheets) | ✅ | ✅ (needs squad rows + 024) |
| Player profile | ✅ | ✅ (needs squad row) |
| Admin live matchday | ✅ | ✅ |
| Admin finance (sponsorships + expenses) | ✅ | ✅ |
| Admin → Results manual GK | ✅ | ✅ (needs 024) |
| Calendar archive (events/fundraisers) | ✅ | ✅ (needs 023) |
| Push notifications | ✅ | ✅ |
| PWA install prompt | ✅ | ✅ |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **001–024** on Club Hub | ⚠️ 023–024 pending |
| 2 | Add squad members (Admin → Squad) — including admin if they need a profile | ⚠️ Operator |
| 3 | Brief squad: login as **ChrisL**-style display name | ⚠️ Operator |

### P1 — Path to 99

See [ROADMAP-99.md](ROADMAP-99.md).

| # | Task | Status |
|---|------|--------|
| 1 | Onboarding + prod bug fixes | ✅ |
| 2 | Finance admin | ✅ |
| 3 | GK clean-sheet fix | ✅ |
| 4 | Calendar archive + result colours | ✅ |
| 5 | E2E tests | Open |
| 6 | Vercel VAPID on production | ✅ |
| 7 | Push smoke test (Admin → Notifications) | ⚠️ Optional |
| 8 | DDSFL sync 2026/27 | ⚠️ When fixtures publish |

---

## Summary

**96 / 100** — GK clean sheets fixed, calendar improvements shipped. Apply migrations **023–024** on Club Hub, then populate squad and brief players on **ChrisL** login format.

**Path to 99:** E2E tests, DDSFL sync, optional push smoke test, a11y and observability — see [ROADMAP-99.md](ROADMAP-99.md).

---

*End of Club Hub audit v10. App baseline `ed6bde1`; docs updated 20 June 2026.*
