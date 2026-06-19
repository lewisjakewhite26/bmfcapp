# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v4)** — see [`docs/ROADMAP-90.md`](docs/ROADMAP-90.md) for the 90+ plan.  
> **Last updated:** 19 June 2026 · **Commit:** `7db75af` on `main` (+ local changes: crest assets, DDSFL 2026/27)

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — 808.06 kB JS (230.75 kB gzip), 38.44 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **5/5 tests** pass on CI (Linux); **Windows local run still times out** on OneDrive path despite fork pool

**Supabase:** Club Hub project confirmed (`kqxsbb…` — EvidInsight); separate from WC predictor (`owkql…`).

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 11 Jun 2026 | 77/100 | P0 closed; Vercel live; CI; lineup builder |
| v2 | 19 Jun 2026 | 79/100 | ConfigRequired diagnostics; legacy WC cleanup |
| v3 | 19 Jun 2026 | 83/100 | Phase 1 done; skeletons; placeholder PWA icons |
| **v4 (this doc)** | **19 Jun 2026** | **87/100** | Push wired; real crest; DDSFL 2026/27; fundraisers |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–012 | ✅ Applied on Club Hub project |
| Supabase migrations 013–014 (fundraisers) | ⚠️ In repo — confirm applied on Club Hub |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ⚠️ Add + redeploy for production push |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Local only — not on Vercel |
| DDSFL data in production DB | ⚠️ Re-run `npm run sync:ddsfl` for 2026/27 Second Division table |
| README + `docs/SUPABASE-SETUP.md` | ✅ Accurate |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| PWA icons (192, 512, maskable, apple-touch, favicon) | ✅ Official club crest (BMFCWC source) |
| Push notifications (VAPID + edge fn) | ⚠️ Edge fn deployed; secrets set; Vercel VAPID key pending |
| `send-push` edge function | ✅ Deployed to Club Hub (`kqxsbbkedhidsfojapny`) |
| Supabase CLI config (`supabase/config.toml`) | ✅ Entrypoint → `supabase-club/functions/send-push` |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment — not treated as launch blockers below.

---

## Changes since audit v3 (83/100)

| Item | Status |
|------|--------|
| Push: VAPID keys generated; `.env.local` public key | ✅ |
| Push: `send-push` deployed via Supabase CLI | ✅ |
| Push: subscribe logging + error handling in hook | ✅ `7db75af` |
| PWA install notification prompt (standalone, one-time) | ✅ `7db75af` |
| Admin Fundraisers + squad participation summary | ✅ `9ed0708`, `14aa9c4` |
| Official club crest (from BMFCWC) — logo, favicon, PWA icons | ✅ Local / pending commit |
| DDSFL active season → **2026/27** (`fsea=8`) | ✅ Local / pending commit |
| BMFC division → **Second Division** (`fcomplge=7`) | ✅ Local / pending commit |
| Vitest fork pool for Windows | ✅ `ef7c929` — CI OK; local OneDrive still flaky |
| E2E tests | ❌ Open |
| Route code splitting | ❌ Open |
| GK clean-sheet fix | ⏸️ Parked |
| Scheduled DDSFL sync | ❌ Open |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **87 / 100** *(+4)* |
| **Overall rating** | **Strong — ready for player onboarding** |
| **Previous score** | 83 / 100 (audit v3, 19 Jun 2026) |
| **Public-launch equivalent** | ~69 / 100 |
| **Gap to 90+** | ~3 points |

Since v3, push infrastructure is live (edge function deployed, client hook + PWA install prompt), the official Bishop Middleham FC crest replaces placeholder branding, and DDSFL is pointed at the **2026/27 Second Division** table. Fundraisers add admin/squad tooling.

Remaining gaps to 90+: **E2E tests**, **route code splitting**, and **production push verification** (Vercel `VITE_VAPID_PUBLIC_KEY` + redeploy).

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 85 | +1 | Good |
| 2 | [Security](#2-security) | 68 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 55 | — | Adequate |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 93 | +2 | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 75 | — | Good |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 78 | +4 | Good |
| 8 | [Database & Supabase](#8-database--supabase) | 92 | +2 | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 54 | — | Adequate |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 96 | +2 | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 92 | +4 | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 88 | — | Good |

---

## 1. Code Quality & Architecture

**Score: 85 / 100**  
**Rating: Good**

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/` with `clubApi.ts` as mock/live boundary.
- Fundraisers feature integrated (admin CRUD + squad participation summary).
- Push notification flow centralised in `pushNotifications.ts` + `usePushNotifications` hook.
- TypeScript strict mode; Supabase access via RPCs.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No route code splitting — ~808 kB single chunk. |
| Positive | `supabase/config.toml` | Edge function deploy path documented and working. |
| Positive | `PwaInstallNotificationPrompt` | Standalone PWA first-launch flow without duplicating toggle logic. |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-squad use**  
*(would be ~45 for a public launch)*

Unchanged from v3. RPC-gated writes, bcrypt passcodes, RLS, committee vs admin split. `send-push` verifies admin session server-side.

---

## 3. Performance

**Score: 55 / 100**  
**Rating: Adequate for team scale**

### Build output (19 Jun 2026)
```
dist/assets/index-T_MHdnY5.js   808.06 kB │ gzip: 230.75 kB
dist/assets/index-77gF-vYZ.css   38.44 kB │ gzip:   7.63 kB
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No lazy routes — bundle grew with fundraisers + push logging. |
| Low | `LandingHeroBackdrop.tsx` | Canvas animation CPU on landing visit. |
| Positive | PWA | Workbox precache; service worker via `injectManifest`. |

---

## 4. Accessibility

**Score: 53 / 100**  
**Rating: Requires Improvement**

Unchanged from v3. Skip link, labelled login/invite fields, bottom nav ARIA. Passcode fieldset, lineup slots, focus trap still open (optional for this deployment).

---

## 5. User Experience

**Score: 93 / 100**  
**Rating: Excellent**

### Strengths
- One-time **PWA install notification prompt** on Dashboard (standalone mode).
- Account menu **push toggle** unchanged; shared enable logic with install prompt.
- **Fundraisers** — admin tracking + squad participation view.
- Branded 404, empty states, skeleton loaders, meaningful auth errors (from v3).

### Findings

| Severity | Issue |
|----------|-------|
| Low | Production push needs Vercel `VITE_VAPID_PUBLIC_KEY` + redeploy to complete end-to-end. |
| Low | DDSFL sync is manual CLI — run after season/division change. |

---

## 6. Data Integrity & Business Logic

**Score: 75 / 100**  
**Rating: Good**

Unchanged. GK clean sheets still over-count (parked). Stats aggregation and DDSFL parsing covered by unit tests.

---

## 7. DDSFL Integration & Data Sync

**Score: 78 / 100**  
**Rating: Good**

| Item | Status |
|------|--------|
| Active season | **2026/27** (`DDSFL_ACTIVE_SEASON = 8`) |
| BMFC division | **Swinburne Maddison Second Division** (`fcomplge=7`) |
| Committed scrape JSON | ✅ Updated (12 teams, pre-season zeros) |
| Production Supabase sync | ⚠️ Operator to run `npm run sync:ddsfl` |
| Scheduled sync | ❌ Open |

Previously used 2025/26 Third Division as placeholder until DDSFL published new tables.

---

## 8. Database & Supabase

**Score: 92 / 100**  
**Rating: Excellent**

| Item | Status |
|------|--------|
| Migrations 001–012 | ✅ Applied |
| Migrations 013–014 (fundraisers) | ⚠️ Confirm on Club Hub |
| `send-push` edge function | ✅ Deployed |
| VAPID secrets on Supabase | ✅ Set (operator) |

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
| Windows Vitest | ⚠️ Worker timeout persists locally; **CI on Linux passes** |

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
| Error monitoring (Sentry) | ❌ |
| Automated DDSFL sync | ❌ |

---

## 11. UI & Design Consistency

**Score: 92 / 100**  
**Rating: Excellent**

Official **Bishop Middleham FC crest** (from BMFCWC `logo.png`) now used in navbar, login, invite, landing, favicon, and all PWA icons. Replaces placeholder “BMFC 2026” text badge.

---

## 12. Copy & Content

**Score: 88 / 100**  
**Rating: Good**

Unchanged. UK copy per `docs/COPY-RULES.md`. League name in app now reflects Second Division via `DDSFL_LEAGUE_NAME`.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ Confirmed |
| 2 | Medium | GK clean sheets over-count | ⏸️ Parked |
| 3 | Low | Vitest worker timeout on Windows (OneDrive) | Open — CI OK |
| 4 | ~~Low~~ | Placeholder logo/crest | ✅ Fixed — official crest |
| 5 | Low | Push subscribe may fail silently without Vercel VAPID | ⚠️ Add env + redeploy |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login / invite | Dev bypass / ✅ | ✅ RPC + meaningful errors |
| Dashboard, calendar, availability | ✅ | ✅ + skeletons + error handling |
| DDSFL fixtures & table | ✅ JSON (2026/27) | ✅ after `sync:ddsfl` |
| Squad stats | ✅ Full | ✅ when match events entered |
| Admin CRUD | ✅ | ✅ |
| Admin fundraisers | ✅ | ✅ after migration 013–014 |
| Lineup builder | ✅ | ✅ |
| Push notifications | ✅ (with VAPID in `.env.local`) | ⚠️ Edge fn live; Vercel key pending |

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
| 3 | Wire dead code | ✅ Done |
| 4 | GK clean-sheet fix + unit test | ⏸️ Parked |
| 5 | Accessibility pass | ⏭️ Optional |
| 6 | E2E tests (login, availability, admin result) | Open |
| 7 | Route code splitting | Open |
| 8 | Push: Vercel VAPID + production E2E test | ⚠️ In progress |
| 9 | DDSFL sync for 2026/27 Second Division | ⚠️ Run `sync:ddsfl` |
| 10 | Apply migrations 013–014 on Club Hub | ⚠️ Confirm |

### P2 — When you have time

1. Scheduled DDSFL sync (GitHub Action) — weekly.
2. Commit crest + DDSFL season assets to `main`.
3. Admin audit log.

---

## Summary

**87 / 100** — the app is **ready for player onboarding**. Push infrastructure is deployed, branding uses the real club crest, and DDSFL targets the correct 2026/27 division.

**~3 points to 90+:** E2E tests, lazy-loaded routes, and closing the remaining push/sync deployment steps.

---

*End of Club Hub audit v4. App baseline `7db75af`; docs updated 19 Jun 2026.*
