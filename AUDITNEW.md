# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v8)** — see [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 20 June 2026 · **Commit:** `79c9688` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~644 kB JS (~180 kB gzip main chunk), admin routes lazy-loaded (`AdminFinance` ~12 kB)  
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
| v7 | 20 Jun 2026 | 93/100 | Prod bug fixes; ChrisL format; photo_url grant; migrations 019–021 |
| **v8 (this doc)** | **20 Jun 2026** | **94/100** | Finance admin — sponsorships, expenses, ledger dashboard; migration 022 |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–018 | ✅ Applied on Club Hub project |
| Supabase migration 019 (names + passcode + invite rework) | ⚠️ Apply / verify on Club Hub (3-arg DROP + explicit GRANTs) |
| Supabase migration 020 (display name **ChrisL** format) | ⚠️ Apply on Club Hub |
| Supabase migration 021 (`photo_url` column grant) | ⚠️ Apply on Club Hub — fixes squad stats load error |
| Supabase migration 022 (finance — sponsorships + expenses) | ⚠️ Apply on Club Hub |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ⚠️ Add + redeploy for production push |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` when fixtures publish |
| Production `squad` table populated | ⚠️ Add players via Admin → Squad (required for stats/profiles) |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate (includes 022) |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons | ✅ Official club crest |
| Push notifications | ⚠️ Edge fn deployed; Vercel VAPID key pending |
| `send-push` edge function | ✅ Deployed to Club Hub |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. Players can change their own passcode; admin reset remains for forgotten codes.

**Onboarding note:** Login uses **display name** (e.g. **`ChrisL`** for Chris Lee). Single-name accounts (e.g. `Lewis`) unchanged. Full first/last name stored internally for admin.

---

## Changes since audit v7 (93/100)

| Item | Status |
|------|--------|
| Admin Finance — sponsorships + expenses + overview dashboard | ✅ `79c9688`, migration 022 |
| Ledger-style `logged_by` / `edited_by` (server-captured, not client-supplied) | ✅ 022 RPCs |
| Admin + committee read/write (not admin-only) | ✅ `adminOnly` guard + `assert_finance_user` |
| Finance mock-mode parity | ✅ `mockFinance.ts` |
| Category breakdown charts (reuse Player Profile bar pattern) | ✅ `FinanceBreakdownChart` |
| E2E tests | ❌ Open |
| GK clean-sheet fix | ⏸️ Parked |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **94 / 100** *(+1)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 93 / 100 (audit v7, 20 Jun 2026) |
| **Public-launch equivalent** | ~74 / 100 |
| **99 target** | See [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md) |

Since v7: Finance admin shipped — sponsorship and expense tracking with paid/pending income, net balance, and transparent ledger notes on every record. Operator still needs migrations **019–022** on Supabase and to **populate the squad table** before stats/profiles work.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 90 | +1 | Good |
| 2 | [Security](#2-security) | 69 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 72 | — | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 98 | +1 | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 81 | +1 | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 80 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 97 | +1 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 62 | — | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 96 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 93 | +1 | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 91 | — | Excellent |

---

## 1. Code Quality & Architecture

**Score: 90 / 100** · **Good**

### Strengths
- Finance split across `financeCategories.ts`, `mockFinance.ts`, `clubApi.ts`, and dedicated UI components.
- `clubApi.ts` uses explicit PostgREST FK hints for `match_events` player + related player embeds.
- Shared `playerNames.ts` mirrored in SQL and mock.
- Lazy-loaded admin routes (including `AdminFinance`); TypeScript strict mode.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `79c9688` | Finance CRUD via RPCs; mock/live parity. |
| Positive | `7189fcc` | `profiles!match_events_player_id_fkey` — avoids PGRST201 ambiguity. |
| Positive | `019`–`022` | Migrations cover onboarding, display format, column grants, finance. |
| Low | `LandingHeroBackdrop.tsx` | Canvas CPU on landing (optional pause). |
| Low | Finance | No unit tests for overview calculations yet. |

---

## 2. Security

**Score: 69 / 100** · **Adequate for closed-squad use** *(~46 public-launch equivalent)*

RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. Finance uses `assert_finance_user` — admin **or** committee; `logged_by` / `edited_by` set server-side from session, never client-supplied. Direct table access blocked by RLS.

---

## 3. Performance

**Score: 72 / 100** · **Good for team scale**

Main chunk ~644 kB / ~180 kB gzip. Admin routes lazy-loaded (`AdminFinance` ~12 kB / ~3.5 kB gzip). Optional: pause landing canvas off-screen.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

Invite first/last name fields and change-passcode labels in place. Finance forms use standard labels. Broader pass deferred — ROADMAP-99 Phase 9.

---

## 5. User Experience

**Score: 98 / 100** · **Excellent**

Invite onboarding, **ChrisL** display names, passcode self-service, live matchday, photos, events, fundraisers, **Finance dashboard** (paid vs pending income, expenses, net balance, category breakdowns), PWA.

| Severity | Issue |
|----------|-------|
| Low | Vercel VAPID pending for production push. |
| Low | Empty squad on prod → stats show “No stats yet”; profiles need squad row. |

---

## 6. Data Integrity & Business Logic

**Score: 81 / 100** · **Good**

Unique `(first_name, last_name)`. Display collision suffix `ChrisL2`. Live drafts separate from `match_events`. Finance ledger: every sponsorship/expense records creator; edits capture `edited_by` + `edited_at`. GK clean sheets over-count (parked).

---

## 7. DDSFL Integration & Data Sync

**Score: 80 / 100** · **Good**

2026/27 Second Division configured. Weekly GitHub Action sync. Operator runs `npm run sync:ddsfl` when fixtures publish.

---

## 8. Database & Supabase

**Score: 97 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations 001–018 | ✅ Applied |
| 019 — invite names, passcode change, admin name edit | ⚠️ Apply / verify |
| 020 — **ChrisL** display name + backfill | ⚠️ Apply |
| 021 — `GRANT SELECT (photo_url)` on profiles | ⚠️ Apply |
| 022 — sponsorships, expenses, finance RPCs | ⚠️ Apply |
| `send-push` | ✅ Deployed |

---

## 9. Testing & Reliability

**Score: 62 / 100** · **Adequate**

Player stats, DDSFL scraper, live match events, and `playerNames` unit tests. CI lint → build → test. No E2E yet. No finance unit tests. Windows Vitest flaky locally.

---

## 10. DevOps & Deployment

**Score: 96 / 100** · **Excellent**

Vercel + GitHub CI, PWA crest icons, weekly DDSFL sync. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 93 / 100** · **Excellent**

Official crest, glass-card admin UI, photo avatars, Finance overview with horizontal bar breakdowns (same pattern as Player Profile charts), ledger notes on list entries.

---

## 12. Copy & Content

**Score: 91 / 100** · **Excellent**

Login placeholder `ChrisL`. UK English. Finance category labels in `financeCategories.ts`. Aligned with `docs/COPY-RULES.md`.

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
| Admin finance (sponsorships + expenses) | ✅ | ✅ after 022 |
| Push notifications | ✅ (local VAPID) | ⚠️ Vercel key pending |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **019**, **020**, **021**, **022** on Club Hub | ⚠️ Operator |
| 2 | Add squad members (Admin → Squad) — including admin if they need a profile | ⚠️ Operator |
| 3 | Brief squad: login as **ChrisL**-style display name | ⚠️ After 020 |

### P1 — Path to 99

See [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md).

| # | Task | Status |
|---|------|--------|
| 1 | Onboarding + prod bug fixes | ✅ `538e006`–`f91371c` |
| 2 | Finance admin | ✅ `79c9688` / 022 |
| 3 | E2E tests | Open |
| 4 | Vercel VAPID + push smoke test | ⚠️ |
| 5 | DDSFL sync 2026/27 | ⚠️ When fixtures publish |
| 6 | GK clean-sheet fix | ⏸️ Parked |

---

## Summary

**94 / 100** — app is production-ready after **migrations 019–022** and **squad setup**. Finance admin gives committee transparent sponsorship and expense tracking with server-side ledger audit.

**Path to 99:** E2E tests, VAPID, DDSFL sync, optional a11y and observability — see [`docs/ROADMAP-99.md`](docs/ROADMAP-99.md).

---

*End of Club Hub audit v8. App baseline `79c9688`; docs updated 20 June 2026.*
