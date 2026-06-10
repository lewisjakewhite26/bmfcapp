# BMFC Club Hub — Project Audit

**Audit date:** 8 June 2026 (revised)  
**Previous audit:** 68 / 100  
**Scope:** Full-stack review of `BMFCWC-main` (React PWA + Supabase + DDSFL scraper)  
**Scoring:** 0–100 per category. 90+ = excellent, 75–89 = strong, 60–74 = acceptable with gaps, 40–59 = significant work needed, below 40 = critical.

**Design note:** 4-digit passcodes are **intentional** for this grassroots squad (~25 players). Scores reflect fitness for that threat model, not enterprise auth standards.

---

## Executive summary

| | |
|---|---|
| **Overall score** | **75 / 100** *(+7)* |
| **Verdict** | Demo-ready in mock mode and materially improved for reliability. Committee/admin permissions are aligned, fetch failures surface properly, and setup docs exist. **Still not fully live-ready** until DDSFL → Supabase sync and live stats aggregation are built. |

### Changes since last audit

| Item | Status |
|------|--------|
| Scraper `path.join` bug | ✅ Fixed |
| `ErrorBoundary` mounted at app root | ✅ Fixed |
| Committee vs admin user management | ✅ Aligned (admin-only) |
| Data hook error states + `DataErrorBanner` | ✅ Fixed |
| Availability save toasts + loading state | ✅ Fixed |
| `README.md` + `docs/SUPABASE-SETUP.md` | ✅ Added |
| `docs/PAGE-COPY.md` refreshed | ✅ Updated |

### Top 5 strengths

1. Complete grassroots club feature set — fixtures, table, stats, calendar, availability, admin.
2. Cohesive UI with consistent glass/brand design system.
3. RPC-gated Supabase schema with bcrypt passcodes and invite-only signup.
4. Mock/live abstraction in `clubApi.ts` — works without backend for demos.
5. Strong documentation: PAGE-COPY, setup guide, README.

### Top 3 blockers before go-live

1. **No DDSFL → Supabase sync** — league fixtures/table only in committed JSON + mock state.
2. **Live stats incomplete** — `appearances` and `clean_sheets` hardcoded to 0 in Supabase mode (`clubApi.ts`).
3. **No automated tests beyond DDSFL parser** — no CI, no E2E.

---

## Scorecard at a glance

| Category | Was | Now | Δ |
|----------|----:|----:|--:|
| [Product & feature completeness](#1-product--feature-completeness) | 82 | 82 | — |
| [UX & user flows](#2-ux--user-flows) | 76 | 81 | +5 |
| [UI & visual design](#3-ui--visual-design) | 84 | 84 | — |
| [Mobile & responsive](#4-mobile--responsive) | 80 | 80 | — |
| [PWA & installability](#5-pwa--installability) | 68 | 68 | — |
| [Accessibility](#6-accessibility) | 56 | 56 | — |
| [Routing & information architecture](#7-routing--information-architecture) | 83 | 87 | +4 |
| [Copy & content](#8-copy--content) | 90 | 92 | +2 |
| [Authentication](#9-authentication) | 64 | 76 | +12 |
| [Security & privacy](#10-security--privacy) | 58 | 58 | — |
| [Supabase schema & RLS](#11-supabase-schema--rls) | 82 | 82 | — |
| [Data layer & API design](#12-data-layer--api-design) | 70 | 70 | — |
| [DDSFL integration](#13-ddsfl-integration) | 68 | 74 | +6 |
| [Player-facing features](#14-player-facing-features) | 81 | 84 | +3 |
| [Admin & committee tools](#15-admin--committee-tools) | 74 | 85 | +11 |
| [Push notifications](#16-push-notifications) | 62 | 62 | — |
| [Error handling & resilience](#17-error-handling--resilience) | 48 | 74 | +26 |
| [Performance](#18-performance) | 76 | 76 | — |
| [Code quality & architecture](#19-code-quality--architecture) | 77 | 80 | +3 |
| [Testing & QA](#20-testing--qa) | 16 | 16 | — |
| [Documentation](#21-documentation) | 58 | 76 | +18 |
| [Deployment readiness](#22-deployment-readiness) | 54 | 62 | +8 |
| [DevOps & CI/CD](#23-devops--cicd) | 20 | 20 | — |
| [Repository hygiene](#24-repository-hygiene) | 45 | 45 | — |

**Weighted overall: 75 / 100**

---

## 1. Product & feature completeness

**Score: 82 / 100** *(unchanged)*

Full squad-app surface area is implemented: landing, auth, dashboard, table, results, stats, calendar, player profiles, and seven admin tools. Mock mode is fully functional with real DDSFL scrape data.

Remaining gaps: no live DDSFL sync, no messaging, no export, no audit log, push requires infra setup.

---

## 2. UX & user flows

**Score: 81 / 100** *(was 76)*

**Improved:**
- Availability save shows success/error toasts and disables picker while saving.
- Failed data loads show red error banners with **Try again** instead of empty “no data” states.
- Committee users see a clear admin hub without user-management options.

**Still friction:**
- No 404 page (wildcard → home).
- Logged-in users can revisit `/login`.
- Stats filter can show blank with no explanation.
- Invite success → `/pending` redirect can feel abrupt.

---

## 3. UI & visual design

**Score: 84 / 100** *(unchanged)*

Strong brand system (navy/blue/gold, glass cards, pill buttons). `pageContainerClass()` and `Skeleton` components still unused — minor DRY debt.

---

## 4. Mobile & responsive

**Score: 80 / 100** *(unchanged)*

Safe-area handling, bottom nav clearance, and touch targets are solid. Bottom nav has no active state for profile/admin routes.

---

## 5. PWA & installability

**Score: 68 / 100** *(unchanged)*

Service worker, manifest, and push handlers exist. SVG-only icons and no offline data strategy limit install quality.

---

## 6. Accessibility

**Score: 56 / 100** *(unchanged)*

Login/invite forms labelled well. Tab switchers, availability picker, and bottom nav lack ARIA patterns. No skip link. Gold-on-white contrast borderline for small text.

---

## 7. Routing & information architecture

**Score: 87 / 100** *(was 83)*

**Improved:**
- `/admin/users` is `requireAdmin` — committee redirected to `/admin`.
- Admin hub filters Squad members card by `user.is_admin`.
- Role-based subtitle: “Committee tools” vs “Committee & admin tools”.

Legacy WC predictor redirects remain. Dual `supabase/` + `supabase-club/` folders still confusing.

---

## 8. Copy & content

**Score: 92 / 100** *(was 90)*

`docs/PAGE-COPY.md` is comprehensive and synced with the app. Tone is club-appropriate. Includes toasts, error banners, and committee/admin variants.

---

## 9. Authentication

**Score: 76 / 100** *(was 64)*

**Accepted design:** Name + 4-digit passcode is appropriate for ~25 grassroots players. Bcrypt hashing, session tokens, invite-only signup, and approval gate are sound for this context.

**Remaining caveats (not blockers for this project):**
- Session token in `localStorage` (XSS surface).
- No rate limiting on login RPCs.
- Mock dev bypass when `useMockData()` is true.

---

## 10. Security & privacy

**Score: 58 / 100** *(unchanged)*

RPC-gated writes and RLS are good. Still open:
- Availability messages publicly readable via RLS.
- Profile roles exposed to anon.
- Default seed passcode `1234` in `seed.sql` (must change on deploy).
- CORS `*` on edge function.

Passcode length is **not** scored as a weakness here per project decision.

---

## 11. Supabase schema & RLS

**Score: 82 / 100** *(unchanged)*

Eight migrations, invite flow, admin RPCs, manual fixture protection, training CRUD. No stats aggregation views or DDSFL sync RPC yet.

---

## 12. Data layer & API design

**Score: 70 / 100** *(unchanged)*

Clean `useMockData()` switch and ~25 API functions. Hooks now expose `error` + `reload`.

**Still broken in live mode:** `fetchPlayerStats()` sets `appearances: 0` and `clean_sheets: 0` for all players.

---

## 13. DDSFL integration

**Score: 74 / 100** *(was 68)*

**Fixed:** Scraper writes mock JSON correctly (`path.join` on line 134).

Parser, constants, Vitest tests, and `ddsfl-scrape.json` import all work. **No Supabase upsert pipeline** or scheduled scrape.

---

## 14. Player-facing features

**Score: 84 / 100** *(was 81)*

| Feature | Score | Notes |
|---------|------:|-------|
| Dashboard | 88 | Nudge, availability inline, error banners |
| Calendar | 85 | List/month + save feedback |
| Availability | 82 | Toasts, disabled state on save |
| League table | 88 | BMFC highlight, DDSFL footer |
| Fixtures & results | 84 | FixtureCard reuse |
| Squad stats | 82 | Full in mock; partial live |
| Player profile | 86 | Radar, timeline, own calendar |

---

## 15. Admin & committee tools

**Score: 85 / 100** *(was 74)*

| Tool | Score | Notes |
|------|------:|-------|
| Admin hub | 92 | Role-filtered cards |
| Squad members | 88 | Admin-only route + UI |
| Squad list | 85 | Committee can manage |
| Fixtures / training / results | 88 | Full CRUD |
| Availability overview | 82 | Error banners added |
| Notifications | 60 | Requires Supabase + VAPID |

Committee/admin split now matches backend RPC permissions.

---

## 16. Push notifications

**Score: 62 / 100** *(unchanged)*

Full stack built (hook, prompt, toggle, edge function, SW handlers). Requires HTTPS, VAPID secrets, and Supabase deploy. Mock mode blocks send.

---

## 17. Error handling & resilience

**Score: 74 / 100** *(was 48)*

**Fixed:**
- All `useClubData` hooks + `usePlayerProfile` expose `error` and `reload`.
- `DataErrorBanner` on Dashboard, Table, Results, Stats, Calendar, Profile, Admin Availability.
- `ErrorBoundary` mounted in `src/main.tsx` wrapping `<App />`.
- Availability save: try/catch + success/error toasts.

**Remaining:**
- No global unhandled rejection handler.
- Some admin form errors still generic.
- `getAuthErrorMessage()` still unused.

---

## 18. Performance

**Score: 76 / 100** *(unchanged)*

Vite build, no heavy chart libs, Tailwind purge. No route lazy-loading or data caching layer.

---

## 19. Code quality & architecture

**Score: 80 / 100** *(was 77)*

**Improved:** `errors.ts`, `DataErrorBanner`, `ErrorBoundary` in use, committee permission props on routes.

**Still unused:** `pageContainerClass()`, `Skeleton` components, `getAuthErrorMessage()`.

---

## 20. Testing & QA

**Score: 16 / 100** *(unchanged)*

One test file: `ddsflScraper.test.ts` (3 cases). No component/E2E tests. No CI workflow. Playwright used for screenshots only.

---

## 21. Documentation

**Score: 76 / 100** *(was 58)*

| Doc | Status |
|-----|--------|
| `README.md` | ✅ Quick start, scripts, roles |
| `docs/SUPABASE-SETUP.md` | ✅ Migrations, seed, VAPID, checklist |
| `docs/PAGE-COPY.md` | ✅ Full UI copy |
| `docs/PROJECT-AUDIT.md` | ✅ This document |
| Architecture diagram | ❌ Missing |
| RPC reference | ⚠️ SQL migrations only |

---

## 22. Deployment readiness

**Score: 62 / 100** *(was 54)*

Build works. Setup guide exists. Still needs: Supabase project wired, migrations applied, DDSFL data in DB, live stats fix, VAPID for push.

---

## 23. DevOps & CI/CD

**Score: 20 / 100** *(unchanged)*

No `.github/workflows`. No automated lint/test on PR.

---

## 24. Repository hygiene

**Score: 45 / 100** *(unchanged)*

Legacy `supabase/` WC predictor co-located. `Signup.tsx` stub. `node_modules/` / `dist/` in workspace.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~High~~ | Scraper `join` undefined | ✅ Fixed |
| 2 | **High** | Live stats: appearances & clean_sheets always 0 | Open |
| 3 | ~~High~~ | Committee/admin permission mismatch | ✅ Fixed |
| 4 | ~~Medium~~ | Availability save silent failures | ✅ Fixed |
| 5 | ~~Medium~~ | Data hook failures show empty UI | ✅ Fixed |
| 6 | ~~Low~~ | `ErrorBoundary` never mounted | ✅ Fixed |
| 7 | Low | `logo.png` missing from `public/` | Open |
| 8 | Low | League table no empty-state message | Open |
| 9 | Low | Stats filter empty view with no copy | Open |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login / invite | Dev bypass / ✅ | ✅ RPC |
| Dashboard, calendar, availability | ✅ | ✅ + error handling |
| DDSFL fixtures & table | ✅ JSON | ⚠️ Needs DB seed/sync |
| Squad stats | ✅ Full | ⚠️ Partial (no apps/CS) |
| Admin CRUD (fixtures, results, training) | ✅ | ✅ |
| Admin users / invites | ✅ | ✅ admin only |
| Push notifications | ❌ | ⚠️ Infra required |

---

## Prioritised roadmap

### P0 — Before live season

| # | Task | Effort |
|---|------|--------|
| 1 | DDSFL scrape → Supabase upsert (fixtures + league table) | 2–3 days |
| 2 | Live stats aggregation (DB view or RPC) | 1–2 days |
| 3 | Apply migrations + seed on production Supabase | 0.5 day |

### P1 — Quality (first month)

| # | Task |
|---|------|
| 4 | E2E tests: login, availability, admin result entry |
| 5 | CI: lint + test on PR |
| 6 | PNG PWA icons (192, 512) |
| 7 | Accessibility pass on tabs, picker, bottom nav |
| 8 | 404 page |

### P2 — Polish

| # | Task |
|---|------|
| 9 | Remove legacy `supabase/` WC predictor |
| 10 | Adopt `pageContainerClass()` everywhere |
| 11 | Per-player push targeting in admin |
| 12 | Audit log for admin actions |

---

## Scoring methodology

Scores reflect **intended use**: grassroots Sunday league squad app, ~25 players, one committee admin.

- **90+** — Best-in-class for category.
- **75–89** — Production-viable with minor polish.
- **60–74** — Works for demo/pilot; known gaps documented.
- **40–59** — Significant risk or incomplete.
- **Below 40** — Critical gap.

**Overall 75** = reliable demo and committee pilot; two data-layer gaps block full live season.

---

## Appendix: tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript 5.7, Vite 6, Tailwind 3.4 |
| Routing | react-router-dom 7 |
| Backend | Supabase (Postgres + RLS + RPC + Edge Functions) |
| PWA | vite-plugin-pwa, Workbox |
| Scraping | Cheerio, tsx CLI |
| Testing | Vitest 4 (1 file), Playwright (screenshots) |

---

*Re-audit based on codebase state after quick-win fixes (June 2026).*
