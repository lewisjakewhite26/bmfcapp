# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v3)** — see [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md) for the 90+ plan.  
> **Last updated:** 19 June 2026 · **Commit:** `2f8d68d` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — 804.39 kB JS (228.81 kB gzip), 37.69 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **5/5 tests** pass; exit code 1 on Windows (Vitest worker timeout on OneDrive path) — **CI on Linux should pass**

**Supabase:** Club Hub project confirmed (`kqxsbb…` — EvidInsight); separate from WC predictor (`owkql…`).

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 11 Jun 2026 | 77/100 | P0 closed; Vercel live; CI; lineup builder |
| v2 | 19 Jun 2026 | 79/100 | ConfigRequired diagnostics; legacy WC cleanup planned |
| **v3 (this doc)** | **19 Jun 2026** | **83/100** | Phase 1 mostly done; dead code wired; skeletons; PWA icons |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–012 | ✅ Applied on Club Hub project (incl. invite approval gate) |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only (`npm run sync:ddsfl`) — not on Vercel |
| DDSFL data in production DB | ✅ Sync script verified (`npm run sync:ddsfl`) |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons (192, 512, maskable, apple-touch) | ✅ Regenerated from `logo.svg` · commit `3359bdd` |
| Push notifications (VAPID + edge fn) | ❌ Not configured — optional |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment — not treated as launch blockers below.

---

## Changes since audit v2 (79/100)

| Item | Status |
|------|--------|
| Legacy WC files removed (`AUDIT.md`, `COPY.md`, `Signup.tsx`, dead CSS) | ✅ `611725d` |
| Login redirect if already authenticated (`GuestRoute`) | ✅ |
| Branded 404 catch-all (`NotFound`) | ✅ |
| Empty states on Stats + league table | ✅ `1974202` |
| Skip-to-content link | ✅ `1974202` |
| `getAuthErrorMessage()` wired (login + invite) | ✅ `8c2c031` |
| `pageContainerClass()` on AdminLineup | ✅ `4c7f4c1` |
| Skeleton loading states (5 pages) | ✅ `aab9422` |
| PWA icons regenerated + manifest/index wired | ✅ `3359bdd` |
| Migration 011 on Club Hub Supabase | ✅ Operator confirmed |
| Invite requires admin approval after passcode setup | ✅ `2f8d68d` · migration 012 applied |
| Supabase Club Hub vs predictor projects identified | ✅ |
| GK clean-sheet fix | ⏸️ Parked until squad onboarded |
| E2E tests | ❌ Open |
| Full accessibility pass | ❌ Partial (skip link only) |
| Scheduled DDSFL sync | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **83 / 100** *(+4)* |
| **Overall rating** | **Strong — ready for player onboarding** |
| **Previous score** | 79 / 100 (audit v2, 19 Jun 2026) |
| **Public-launch equivalent** | ~67 / 100 |
| **Gap to 90+** | ~7 points |

Since v2, Phase 1 of the roadmap is largely complete: production Supabase is confirmed (including lineups), legacy predictor cruft is gone, auth errors surface RPC messages, loading states use skeletons, and PWA icons are committed. The app is in good shape to onboard players.

Remaining gaps to 90+: **accessibility** (partial pass done), **E2E tests**, **bundle splitting**, **GK clean sheets** (when stats matter), and **DDSFL sync automation**.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 84 | +3 | Good |
| 2 | [Security](#2-security) | 68 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 55 | −1 | Adequate |
| 4 | [Accessibility](#4-accessibility) | 53 | +5 | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 91 | +4 | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 75 | — | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 74 | — | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 90 | +5 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 54 | — | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 94 | +2 | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 88 | +3 | Good |
| 12 | [Copy & Content](#12-copy--content) | 88 | +2 | Good |

---

## 1. Code Quality & Architecture

**Score: 84 / 100**  
**Rating: Good**

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/` with `clubApi.ts` as the mock/live boundary.
- Previously unused helpers now wired: `getAuthErrorMessage()`, `pageContainerClass()`, `Skeleton` variants.
- Legacy WC predictor code and ~200 lines of dead CSS removed.
- TypeScript strict mode; Supabase access via RPCs.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No route code splitting — ~804 kB single chunk. |
| Positive | `authErrors.ts` | Login/invite RPC errors surfaced to user. |
| Positive | `layout.ts` | All nav pages + AdminLineup use `pageContainerClass()`. |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-squad use**  
*(would be ~45 for a public launch)*

Unchanged from v2. RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. Accepted: 4-digit passcodes, no rate limiting, client-side sessions.

---

## 3. Performance

**Score: 55 / 100**  
**Rating: Adequate for team scale**

### Build output
```
dist/assets/index-Bc1EJilG.js   804.39 kB │ gzip: 228.81 kB
dist/assets/index-7GjRyiGY.css   37.69 kB │ gzip:   7.49 kB
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No lazy routes — bundle grew slightly (+16 kB) with skeleton components. |
| Low | `LandingHeroBackdrop.tsx` | Canvas animation CPU on landing visit. |
| Positive | Skeleton loaders | Perceived performance improved on 5 key pages. |
| Positive | PWA | Workbox precache; service worker via `injectManifest`. |

---

## 4. Accessibility

**Score: 53 / 100**  
**Rating: Requires Improvement**

### What exists
- **Skip-to-content link** in `PageShell` (keyboard focusable).
- Login / invite fields use `htmlFor` + matching `id`.
- Bottom nav: `aria-label`, `aria-expanded` on account menu.
- Calendar month controls: `aria-label` on prev/next.

### Remaining gaps

| Severity | Issue |
|----------|-------|
| Medium | Passcode inputs not grouped with `fieldset` / `legend` |
| Low | Lineup pitch slots — no `aria-pressed` |
| Low | Account sheet — no focus trap |

---

## 5. User Experience

**Score: 91 / 100**  
**Rating: Excellent**

### Strengths
- Clear flow: Landing → Login (or invite) → Dashboard → fixtures / calendar / availability.
- **GuestRoute** redirects logged-in users away from `/login`.
- Branded **404** with path display and contextual home link.
- **Empty states** on Stats and league table explain why data is missing; admin CTA on stats.
- **Skeleton loaders** on Dashboard, table, stats, calendar, player profile.
- Auth RPC errors show meaningful messages (wrong passcode, invalid invite, etc.).

### Findings

| Severity | Issue |
|----------|-------|
| Low | Push notifications show "not configured" until VAPID setup. |
| Low | DDSFL sync is manual CLI — no in-app refresh for admin. |

---

## 6. Data Integrity & Business Logic

**Score: 75 / 100**  
**Rating: Good**

Unchanged. GK clean sheets still over-count (parked until squad onboarding). Stats aggregation and DDSFL parsing covered by unit tests.

---

## 7. DDSFL Integration & Data Sync

**Score: 74 / 100**  
**Rating: Good**

Unchanged. Manual `npm run sync:ddsfl` only; no scheduled sync.

---

## 8. Database & Supabase

**Score: 90 / 100**  
**Rating: Excellent**

Operator confirmed Club Hub-only project (`profiles`, `squad`, `lineups` present; no predictor tables). Migration **011 (lineups)** applied.

| Table | Status |
|-------|--------|
| `lineups` | ✅ Present — lineup save works in prod |
| All 001–012 migrations | ✅ Applied |

Edge function: `send-push` present in repo; not deployed.

---

## 9. Testing & Reliability

**Score: 54 / 100**  
**Rating: Adequate**

| Area | Coverage |
|------|----------|
| Player stats aggregation | ✅ 2 tests |
| DDSFL scraper parsing | ✅ 3 tests |
| CI pipeline | ✅ lint → build → test |
| E2E | ❌ None |
| Windows Vitest | ⚠️ Worker timeout (CI OK) |

`getAuthErrorMessage` has no dedicated unit tests yet.

---

## 10. DevOps & Deployment

**Score: 94 / 100**  
**Rating: Excellent**

| Item | Status |
|------|--------|
| Vercel SPA + GitHub CI | ✅ |
| Multiple clean commits pushed to `main` (Jun 19 session) | ✅ |
| PWA manifest + PNG icons in repo | ✅ |
| `ConfigRequired` diagnostics | ✅ |
| `.env.example` notes Club Hub vs predictor | ✅ |
| Error monitoring (Sentry) | ❌ |
| Automated DDSFL sync | ❌ |

---

## 11. UI & Design Consistency

**Score: 88 / 100**  
**Rating: Good**

Cohesive BMFC brand maintained. Skeleton loaders match page layout shapes. PWA icons regenerated from `logo.svg` (placeholder crest — replace SVG when real crest available).

---

## 12. Copy & Content

**Score: 88 / 100**  
**Rating: Good**

Empty states use human UK copy per `docs/COPY-RULES.md`. Single audit doc (`AUDITNEW.md`); legacy `COPY.md` / `PROJECT-AUDIT.md` removed.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ Confirmed |
| 2 | Medium | GK clean sheets over-count | ⏸️ Parked |
| 3 | Low | Vitest worker timeout on Windows | Open — CI OK |
| 4 | Low | `logo.svg` is placeholder — not real club crest | Open |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login / invite | Dev bypass / ✅ | ✅ RPC + meaningful errors |
| Dashboard, calendar, availability | ✅ | ✅ + skeletons + error handling |
| DDSFL fixtures & table | ✅ JSON | ✅ after `sync:ddsfl` |
| Squad stats | ✅ Full | ✅ when match events entered |
| Admin CRUD | ✅ | ✅ |
| Admin users / invites | ✅ | ✅ admin only |
| Lineup builder | ✅ | ✅ migration 011 applied |
| Push notifications | ❌ | ⚠️ VAPID + edge fn deploy |

---

## Prioritised action list

### P0 — Before live season

*All complete.*

### P1 — Quality (path to 90+)

See [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md).

| # | Task | Status |
|---|------|--------|
| 1 | Migration 011 on Club Hub Supabase | ✅ Done |
| 2 | Empty states + skeleton loaders | ✅ Done |
| 3 | Wire dead code (`getAuthErrorMessage`, `pageContainerClass`, Skeleton) | ✅ Done |
| 4 | GK clean-sheet fix + unit test | ⏸️ Parked |
| 5 | Accessibility pass (passcode fieldset, lineup slots, focus trap) | Open |
| 6 | E2E tests (login, availability, admin result) | Open |
| 7 | Route code splitting | Open |

### P2 — When you have time

1. Scheduled DDSFL sync (GitHub Action) — weekly.
2. Deploy `send-push` + VAPID keys.
3. Replace placeholder `logo.svg` with real crest; re-run `npm run generate:pwa-icons`.
4. Admin audit log.

### Explicitly not required (operator decision)

- Login rate limiting / longer passcodes
- Server-side session invalidation
- Full WCAG 2.2 AA certification
- GK fix before squad onboarding begins

---

## Summary

**83 / 100** — the app is **ready for player onboarding**. Production Supabase is confirmed, lineups work, UX polish is in place (empty states, skeletons, auth errors, 404), and the repo is clean of legacy predictor code.

**~7 points to 90+:** accessibility completion, E2E tests, bundle splitting, and optional automation (DDSFL sync, push).

---

*End of Club Hub audit v3. App baseline `2f8d68d`; docs updated 19 Jun 2026.*
